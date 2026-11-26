import { expect, test, type Page } from '@playwright/test';

const pageErrors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
});
test.afterEach(async ({ page, colorScheme }) => {
  expect(pageErrors.get(page)).toEqual([]);
  await expect(page.locator('html')).toHaveAttribute('data-theme', colorScheme || 'light');
});

// All API requests are intercepted: these tests never change MySQL or real accounts.
const shelter = { id_refugio: 1, nombre_organizacion: 'Refugio de nombre extenso para comprobar el diseño',
  ciudad: 'Querétaro', estado: 'Querétaro', direccion: 'Calle de prueba 18', telefono: '0000000000', estado_cuenta: 'activo' };
const animal = { id_animal: 1, id_refugio: 1, nombre: 'Nala', especie: 'Perro', raza: 'Mestizo', sexo: 'Hembra',
  edad_estimada: '2 años', tamano: 'Mediano', descripcion: 'Compañera tranquila que busca un hogar.',
  foto_url: '/logo.svg', es_urgente: false, estado_adopcion: 'disponible', refugio: shelter };
const user = { id_usuario: 41, id_rol: 3, nombre_completo: 'Persona de prueba', correo: 'e2e@example.com',
  telefono: '0000000000', ciudad: 'Querétaro' };
const application = { id_solicitud: 1, id_usuario: 41, id_animal: 2, estado_solicitud: 'pendiente',
  mensaje: 'Tengo una vivienda segura y tiempo para acompañar su adaptación.',
  fecha_solicitud: '2026-11-25T10:00:00', notas_internas: null, respuesta_publica: null,
  animal: { ...animal, id_animal: 2, nombre: 'Mora' } };

async function mockApi(page: Page) {
  const state = {
    favorites: true, failFavorites: false, failApplications: false, failVolunteer: false,
    failDelete: false, deferDelete: false, deleteCalls: 0, favoriteChecks: 0, applicationLoads: 0,
    releaseDelete: undefined as undefined | (() => void),
    applications: [application],
  };
  await page.addInitScript((account) => {
    const payload = btoa(JSON.stringify({ sub: String(account.id_usuario), exp: Math.floor(Date.now() / 1000) + 3600 }));
    localStorage.setItem('auth_token', `e30.${payload}.mock-signature`);
    localStorage.setItem('auth_user', JSON.stringify(account));
    localStorage.setItem('auth_role', 'Usuario');
  }, user);
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const method = route.request().method();
    const json = (body: unknown, status = 200) => route.fulfill({ status, json: body });
    if (path === '/api/auth/me') return json(user);
    if (path === '/api/favoritos/relacion/mis-favoritos')
      return state.failFavorites ? json({ detail: 'Error simulado' }, 503) :
        json(state.favorites ? [{ id_favorito: 1, id_usuario: 41, animal }] : []);
    if (path === '/api/favoritos/animal/1' && method === 'DELETE') {
      state.deleteCalls++;
      if (state.deferDelete) await new Promise<void>((resolve) => { state.releaseDelete = resolve; });
      if (state.failDelete) return json({ detail: 'Error simulado' }, 503);
      state.favorites = false;
      return json({ mensaje: 'Eliminado' });
    }
    if (path.startsWith('/api/favoritos/verificar/')) {
      state.favoriteChecks++;
      return json({ es_favorito: state.favorites });
    }
    if (path === '/api/solicitudes/relacion/mis-solicitudes') {
      state.applicationLoads++;
      return state.failApplications ? json({ detail: 'Error simulado' }, 503) : json(state.applications);
    }
    if (path === '/api/solicitudes' && method === 'POST') {
      const created = { ...application, ...route.request().postDataJSON(), id_solicitud: 2, animal };
      state.applications.unshift(created);
      return json(created, 201);
    }
    if (path === '/api/voluntariado/mis-solicitudes')
      return state.failVolunteer ? json({ detail: 'Error simulado' }, 503) : json([]);
    if (path === '/api/consultas-juntas/refugios-directorio') return json([shelter]);
    if (path === '/api/consultas-juntas/catalogo') return json([animal]);
    if (path === '/api/animales/1/detalle-completo') return json({ ...animal, es_favorito: true });
    return json({ detail: `Petición inesperada: ${method} ${path}` }, 404);
  });
  return state;
}

test('la acción de quitar no cubre el refugio ni el enlace de la ficha', async ({ page }) => {
  const state = await mockApi(page);
  await page.goto('/perfil?tab=favoritos');
  const remove = page.getByRole('button', { name: 'Quitar de favoritos: Nala', exact: true });
  await expect(remove).toBeVisible();
  await expect(page.getByRole('button', { name: /Quitar.*favorito/i })).toHaveCount(1);
  const link = page.getByRole('link', { name: 'Conocer más →' });
  const shelterText = page.getByText(shelter.nombre_organizacion, { exact: true });
  for (const target of [link, shelterText]) {
    const [actionBox, targetBox] = await Promise.all([remove.boundingBox(), target.boundingBox()]);
    expect(actionBox).not.toBeNull();
    expect(targetBox).not.toBeNull();
    expect(actionBox!.y).toBeGreaterThanOrEqual(targetBox!.y + targetBox!.height);
  }
  await link.scrollIntoViewIfNeeded();
  expect(await link.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)?.closest('a') === node;
  })).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect(state.favoriteChecks).toBe(0);
});

test('quitar espera al servidor, bloquea dobles envíos y actualiza el contador', async ({ page }) => {
  const state = await mockApi(page);
  state.deferDelete = true;
  await page.goto('/perfil');
  const remove = page.getByRole('button', { name: 'Quitar de favoritos: Nala', exact: true });
  await remove.click();
  await expect.poll(() => state.deleteCalls).toBe(1);
  await expect(remove).toBeDisabled();
  await expect(page.getByRole('heading', { name: 'Nala', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Favoritos Guardados \(1\)/ })).toBeVisible();
  await remove.evaluate((button: HTMLButtonElement) => button.click());
  expect(state.deleteCalls).toBe(1);
  state.releaseDelete!();
  await expect(page.getByRole('heading', { name: 'Aún no tienes favoritos guardados' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Favoritos Guardados \(0\)/ })).toBeVisible();
});

test('un fallo al quitar conserva la tarjeta y permite reintentar', async ({ page }) => {
  const state = await mockApi(page);
  state.failDelete = true;
  await page.goto('/perfil');
  const remove = page.getByRole('button', { name: 'Quitar de favoritos: Nala', exact: true });
  await remove.click();
  await expect(page.getByRole('alert').filter({ hasText: 'No pudimos completar la operación' })).toBeVisible();
  await expect(remove).toBeEnabled();
  await expect(page.getByRole('button', { name: /Favoritos Guardados \(1\)/ })).toBeVisible();
  state.failDelete = false;
  await remove.click();
  await expect(page.getByRole('heading', { name: 'Aún no tienes favoritos guardados' })).toBeVisible();
});

test('fallar favoritos no parece una lista vacía ni bloquea solicitudes', async ({ page }) => {
  const state = await mockApi(page);
  state.failFavorites = true;
  await page.goto('/perfil');
  await expect(page.getByRole('button', { name: 'Reintentar favoritos' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Aún no tienes favoritos guardados' })).toHaveCount(0);
  await page.getByRole('button', { name: /Mis Solicitudes/ }).click();
  await expect(page.getByRole('heading', { name: 'Mora', exact: true })).toBeVisible();
  const requests = state.applicationLoads;
  await page.getByRole('button', { name: /Favoritos Guardados/ }).click();
  state.failFavorites = false;
  await page.getByRole('button', { name: 'Reintentar favoritos' }).click();
  await expect(page.getByRole('button', { name: 'Quitar de favoritos: Nala' })).toBeVisible();
  expect(state.applicationLoads).toBe(requests);
});

test('fallar solicitudes no parece un historial vacío', async ({ page }) => {
  const state = await mockApi(page);
  state.failApplications = true;
  await page.goto('/perfil?tab=solicitudes');
  await expect(page.getByRole('button', { name: 'Reintentar solicitudes' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Aún no has enviado solicitudes de adopción' })).toHaveCount(0);
  state.failApplications = false;
  await page.getByRole('button', { name: 'Reintentar solicitudes' }).click();
  await expect(page.getByRole('heading', { name: 'Mora', exact: true })).toBeVisible();
});

test('fallar voluntariado no muestra un historial vacío ni un formulario incompleto', async ({ page }) => {
  const state = await mockApi(page);
  state.failVolunteer = true;
  await page.goto('/perfil?tab=voluntariado');
  await expect(page.getByRole('button', { name: 'Volver a cargar' })).toBeVisible();
  await expect(page.getByText('Aún no has enviado solicitudes de voluntariado.', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Enviar solicitud de voluntariado' })).toHaveCount(0);
  state.failVolunteer = false;
  await page.getByRole('button', { name: 'Volver a cargar' }).click();
  await expect(page.getByRole('button', { name: 'Enviar solicitud de voluntariado' })).toBeVisible();
});

test('las secciones tienen enlaces directos y la ficha vuelve a favoritos', async ({ page }) => {
  await mockApi(page);
  await page.goto('/perfil?tab=solicitudes');
  await expect(page.getByRole('heading', { name: 'Mis solicitudes de adopción', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Mis solicitudes de adopción', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Mi voluntariado', exact: true }).click();
  await expect(page).toHaveURL(/tab=voluntariado/);
  await expect(page.getByRole('heading', { name: 'Mi voluntariado', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Favoritos Guardados/ }).click();
  await page.getByRole('link', { name: 'Conocer más →' }).click();
  await page.getByRole('link', { name: 'Volver a mi perfil', exact: false }).click();
  await expect(page).toHaveURL(/\/perfil\?tab=favoritos$/);
  await expect(page.getByRole('button', { name: 'Quitar de favoritos: Nala', exact: true })).toBeVisible();
});

test('el éxito de postulación y los enlaces de ayuda abren la sección correcta', async ({ page }) => {
  await mockApi(page);
  await page.goto('/mascotas/1');
  await page.getByRole('button', { name: 'Iniciar Solicitud de Adopción', exact: false }).click();
  await page.getByLabel('Tipo de Vivienda', { exact: true }).selectOption('casa-patio');
  await page.getByLabel('¿Has cuidado mascotas antes?', { exact: true }).selectOption('no');
  await page.getByLabel('Motivación y cuidados que ofrecerás', { exact: true }).fill(
    'Puedo ofrecer un hogar seguro, paseos diarios y acompañamiento veterinario.');
  await page.getByRole('button', { name: 'Enviar postulación gratuita' }).click();
  await page.getByRole('link', { name: 'Ver estado en Mi Perfil' }).click();
  await expect(page).toHaveURL(/\/perfil\?tab=solicitudes$/);
  await expect(page.getByRole('heading', { name: 'Nala', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Voluntariado activo', exact: true }).click();
  await expect(page).toHaveURL(/\/perfil\?tab=voluntariado$/);
  await expect(page.getByRole('heading', { name: 'Mi voluntariado', exact: true })).toBeVisible();
});
