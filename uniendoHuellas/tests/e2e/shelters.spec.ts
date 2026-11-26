import { expect, test, type Page } from '@playwright/test';
import type { BackendAnimal, ManagedShelter, ShelterData } from '../../lib/api';

const errors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const list: string[] = [];
  errors.set(page, list);
  page.on('pageerror', (error) => list.push(error.message));
});
test.afterEach(async ({ page, colorScheme }) => {
  expect(errors.get(page)).toEqual([]);
  await expect(page.locator('html')).toHaveAttribute('data-theme', colorScheme || 'light');
});

const newShelter: ShelterData = {
  nombre_organizacion: 'Refugio Ñandú', direccion: 'Calle del Río 18, Centro, CP 76000',
  ciudad: 'Querétaro', estado: 'Querétaro', telefono: '+52 (442) 123-4567',
};
async function mockApi(page: Page, role = 1) {
  const account = { id_usuario: 80, id_rol: role, nombre_completo: 'Persona de prueba', correo: 'prueba@example.com', telefono: '0000000000' };
  const shelters: ManagedShelter[] = [
    { ...newShelter, id_refugio: 1, nombre_organizacion: 'Hogar del Río', estado_cuenta: 'activo', total_animales: 0 },
    { ...newShelter, id_refugio: 2, nombre_organizacion: 'Refugio en pausa', estado_cuenta: 'suspendido', total_animales: 0 },
  ];
  const state = { shelters, animals: [] as BackendAnimal[], failList: false, failSave: false, failApplications: false,
    deferSave: false, releaseSave: undefined as undefined | (() => void), posts: 0, updates: 0, managedLoads: 0 };
  await page.addInitScript((user) => {
    if (sessionStorage.getItem('e2e-public')) return;
    const payload = btoa(JSON.stringify({ sub: String(user.id_usuario), exp: Math.floor(Date.now() / 1000) + 3600 }));
    localStorage.setItem('auth_token', `e30.${payload}.mock-signature`);
  }, account);
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const method = route.request().method();
    const json = (data: unknown, status = 200) => route.fulfill({ json: data, status });
    if (path === '/api/auth/me') return json(account);
    if (path === '/api/consultas-juntas/dashboard') return json({
      total_refugios: state.shelters.length, total_refugios_activos: state.shelters.filter((item) => item.estado_cuenta === 'activo').length,
      total_animales: state.animals.length, total_animales_disponibles: state.animals.length,
      total_animales_adoptados: 0, total_usuarios: 2, total_solicitudes: 0, solicitudes_pendientes: 0,
      solicitudes_aprobadas: 0, animales_por_especie: {}, ultimos_animales: [],
    });
    if (path === '/api/refugios/gestion') {
      state.managedLoads++;
      return state.failList ? json({ detail: 'Fallo simulado' }, 503) : json(state.shelters);
    }
    if (path === '/api/refugios' && method === 'POST') {
      state.posts++;
      if (state.deferSave) await new Promise<void>((resolve) => { state.releaseSave = resolve; });
      if (state.failSave) return json({ detail: 'Fallo simulado' }, 503);
      const created = { ...route.request().postDataJSON(), id_refugio: state.shelters.length + 1, estado_cuenta: 'activo', total_animales: 0 };
      state.shelters.push(created);
      return json(created, 201);
    }
    if (/^\/api\/refugios\/\d+$/.test(path) && method === 'PUT') {
      state.updates++;
      if (state.failSave) return json({ detail: 'Fallo simulado' }, 503);
      const item = state.shelters.find((shelter) => shelter.id_refugio === Number(path.split('/').pop()))!;
      Object.assign(item, route.request().postDataJSON());
      return json(item);
    }
    if (path === '/api/animales/ingreso') {
      const body = await new Response(route.request().postData(), {
        headers: { 'Content-Type': route.request().headers()['content-type'] },
      }).formData();
      const data = JSON.parse(String(body.get('datos')));
      const shelter = state.shelters.find((item) => item.id_refugio === data.id_refugio)!;
      const created = { ...data, id_animal: 9, foto_url: '/logo.svg', refugio: shelter };
      state.animals.push(created);
      shelter.total_animales++;
      return json(created, 201);
    }
    if (path === '/api/animales/relacion/con-refugio') return json(state.animals);
    if (path === '/api/solicitudes/relacion/detalladas') return state.failApplications ? json({ detail: 'Fallo simulado' }, 503) : json([]);
    if (path === '/api/consultas-juntas/refugios-directorio')
      return json(state.shelters.filter((item) => item.estado_cuenta === 'activo').map((item) => ({ ...item, animales: [] })));
    if (path === '/api/consultas-juntas/catalogo')
      return json(state.animals.filter((item) => state.shelters.find((shelter) => shelter.id_refugio === item.id_refugio)?.estado_cuenta === 'activo'));
    return json({ detail: `Petición inesperada: ${method} ${path}` }, 404);
  });
  return state;
}
async function openShelters(page: Page) {
  await page.goto('/admin');
  await page.getByRole('button', { name: 'Refugios', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Gestión de refugios', exact: true })).toBeVisible();
}
async function fillShelter(page: Page) {
  for (const [id, value] of Object.entries(newShelter)) await page.locator(`#shelter-${id}`).fill(value);
}

test('crear valida campos, bloquea doble envío y habilita ingreso y directorio', async ({ page }) => {
  const state = await mockApi(page);
  await openShelters(page);
  await page.getByRole('button', { name: 'Añadir refugio', exact: true }).click();
  await page.getByRole('button', { name: 'Crear refugio', exact: true }).click();
  await expect(page.locator('#shelter-nombre_organizacion')).toHaveAttribute('aria-invalid', 'true');
  expect(state.posts).toBe(0);
  await fillShelter(page);
  state.deferSave = true;
  await page.getByRole('button', { name: 'Crear refugio', exact: true }).click();
  await expect.poll(() => state.posts).toBe(1);
  await expect(page.getByRole('button', { name: 'Guardando…', exact: true })).toBeDisabled();
  state.releaseSave!();
  await expect(page.getByRole('heading', { name: newShelter.nombre_organizacion, exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Nuevo Ingreso', exact: false }).click();
  await expect(page.getByLabel('Refugio', { exact: true }).getByRole('option', { name: newShelter.nombre_organizacion })).toHaveCount(1);
  await expect(page.getByLabel('Refugio', { exact: true }).getByRole('option', { name: 'Refugio en pausa' })).toHaveCount(0);
  await page.getByLabel('Refugio', { exact: true }).selectOption('3');
  await page.getByLabel('Nombre', { exact: true }).fill('Nala');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect.poll(() => state.animals.length).toBe(1);
  expect(state.animals[0].id_refugio).toBe(3);
  await page.getByRole('button', { name: 'Inventario de Animales', exact: false }).click();
  await expect(page.getByText('Nala', { exact: true })).toBeVisible();
  await page.evaluate(() => { localStorage.clear(); sessionStorage.setItem('e2e-public', '1'); });
  await page.goto('/refugios');
  await expect(page.getByRole('heading', { name: newShelter.nombre_organizacion, exact: true })).toBeVisible();
});

test('editar conserva datos y la suspensión se confirma sin borrar registros', async ({ page }) => {
  const state = await mockApi(page);
  await openShelters(page);
  await page.getByRole('button', { name: 'Editar refugio: Hogar del Río', exact: true }).click();
  await expect(page.getByLabel('Ciudad', { exact: true })).toHaveValue('Querétaro');
  await page.getByLabel('Ciudad', { exact: true }).fill('Mérida');
  await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
  await expect(page.getByText('Mérida, Querétaro', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Suspender refugio: Hogar del Río', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('se conservarán');
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  expect(state.updates).toBe(1);
  await page.getByRole('button', { name: 'Suspender refugio: Hogar del Río', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar suspensión', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Activar refugio: Hogar del Río', exact: true })).toBeVisible();
  expect(state.shelters.length).toBe(2);
  await expect(page.getByRole('button', { name: 'Nuevo Ingreso', exact: false })).toBeDisabled();
  await page.getByRole('button', { name: 'Activar refugio: Hogar del Río', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar activación', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Suspender refugio: Hogar del Río', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Nuevo Ingreso', exact: false })).toBeEnabled();
});

test('error de guardado conserva el formulario y permite reintentar', async ({ page }) => {
  const state = await mockApi(page);
  state.failSave = true;
  await openShelters(page);
  await page.getByRole('button', { name: 'Añadir refugio', exact: true }).click();
  await fillShelter(page);
  await page.getByRole('button', { name: 'Crear refugio', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('No pudimos completar');
  await expect(page.getByLabel('Dirección completa', { exact: true })).toHaveValue(newShelter.direccion);
  expect(state.shelters.length).toBe(2);
  state.failSave = false;
  await page.getByRole('button', { name: 'Crear refugio', exact: true }).click();
  await expect(page.getByRole('heading', { name: newShelter.nombre_organizacion, exact: true })).toBeVisible();
});

test('carga fallida muestra reintento y no una lista vacía', async ({ page }) => {
  const state = await mockApi(page);
  state.failList = true;
  await openShelters(page);
  await expect(page.getByRole('button', { name: 'Reintentar refugios', exact: true })).toBeVisible();
  await expect(page.getByText('Aún no hay refugios.', { exact: false })).toHaveCount(0);
  state.failList = false;
  state.failApplications = true;
  await page.getByRole('button', { name: 'Reintentar refugios', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Hogar del Río', exact: true })).toBeVisible();
});

test('buscador sin tildes, filtros y diálogo usables sin desbordamiento', async ({ page }) => {
  await mockApi(page);
  await openShelters(page);
  await page.getByRole('searchbox', { name: 'Buscar refugios', exact: true }).fill('Queretaro');
  await expect(page.getByRole('heading', { name: 'Hogar del Río', exact: true })).toBeVisible();
  await page.getByLabel('Estado del refugio', { exact: true }).selectOption('suspendido');
  await expect(page.getByRole('heading', { name: 'Hogar del Río', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Refugio en pausa', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Editar refugio: Refugio en pausa', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Editar refugio: Refugio en pausa', exact: true })).toBeFocused();
});

test('un adoptante no accede a la gestión de refugios', async ({ page }) => {
  const state = await mockApi(page, 3);
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/$/);
  expect(state.managedLoads).toBe(0);
  await expect(page.getByRole('button', { name: 'Añadir refugio', exact: true })).toHaveCount(0);
});
