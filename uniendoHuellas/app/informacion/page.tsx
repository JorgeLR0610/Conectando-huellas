import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AdminRouteBoundary from '@/components/AdminRouteBoundary';

export default function InformationPage() {
  return <AdminRouteBoundary><Navbar /><main className="max-w-3xl mx-auto px-gutter pt-32 pb-16 space-y-10">
    <h1 className="text-3xl font-bold">Información y uso responsable</h1>
    <p>Conectando Huellas es un proyecto académico de demostración. Los datos de muestra, las direcciones y las fotografías son ilustrativos; no deben utilizarse para contactar organizaciones reales ni planificar visitas.</p>
    <section id="privacidad" className="scroll-mt-28 space-y-3">
      <h2 className="text-2xl font-bold">Privacidad en esta demostración</h2>
      <p>El registro almacena nombre, correo, teléfono, ciudad y una contraseña protegida mediante hash. Las solicitudes se asocian a tu cuenta y el personal autorizado puede consultar tus datos de contacto y el mensaje enviado.</p>
      <p>La sesión usa almacenamiento local del navegador. Cierra sesión si utilizas un equipo compartido. No introduzcas documentos, datos financieros ni información sensible en los mensajes. Para esta revisión utiliza datos ficticios.</p>
      <p>No hay recuperación automática de contraseñas ni gestión de eliminación de cuentas desde la interfaz. El responsable de la instalación debe gestionar estas peticiones antes de un uso real.</p>
    </section>
    <section id="condiciones" className="scroll-mt-28 space-y-3">
      <h2 className="text-2xl font-bold">Condiciones de la demostración</h2>
      <p>Enviar una solicitud no garantiza una adopción. El refugio revisa cada caso y publica su resolución en Mi Perfil. Los requisitos, visitas y plazos deben confirmarse directamente con el refugio; la plataforma no dispone de agenda ni procesa pagos.</p>
      <p>Los datos de salud sin confirmar no implican que un tratamiento se haya realizado. Verifica la información y necesidades del animal antes de cualquier compromiso.</p>
      <p>Antes de publicar este proyecto para uso real se necesitan un aviso de privacidad validado, responsables de atención, HTTPS y configuración de producción. Este texto informativo no sustituye asesoría legal.</p>
    </section>
    <Link href="/refugios" className="text-primary underline">Consultar refugios participantes</Link>
  </main><Footer /></AdminRouteBoundary>;
}
