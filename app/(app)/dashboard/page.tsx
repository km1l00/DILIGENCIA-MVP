import { getCurrentUser, getLatestAssessment, getAssessmentHistory, getCriticalFindings, getFindingsCounts } from '@/lib/data/queries'
import { redirect } from 'next/navigation'
import DashboardClient from './dashboard-client'

export default async function DashboardPage() {
  const result = await getCurrentUser()

  if (!result || !result.authUser) redirect('/')
  
  const { authUser, dbUser, error } = result;

  if (error || !dbUser) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <div className="text-4xl text-port-red">⚠️</div>
        <h2 className="text-xl font-semibold text-foreground">Usuario sin registro en Base de Datos</h2>
        <p className="text-muted-foreground text-sm max-w-sm">
          Tu usuario Autenticado ({authUser.email}) entró correctamente, pero falta crear su fila correspondiente en la tabla "users" de tu base de datos y conectarla a un "tenant".
        </p>
      </div>
    )
  }

  if (!dbUser.tenants) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <div className="text-4xl">⚓</div>
        <h2 className="text-xl font-semibold text-foreground">Cuenta sin empresa asignada</h2>
        <p className="text-muted-foreground text-sm max-w-sm">
          Tu cuenta aún no tiene una empresa vinculada. Contacta al administrador para activar tu acceso.
        </p>
      </div>
    )
  }

  const tenantId = dbUser.tenant_id

  const [assessment, history, criticalFindings, counts] = await Promise.all([
    getLatestAssessment(tenantId),
    getAssessmentHistory(tenantId),
    getCriticalFindings(tenantId),
    getFindingsCounts(tenantId),
  ])

  return (
    <DashboardClient
      company={dbUser.tenants}
      assessment={assessment}
      history={history}
      criticalFindings={criticalFindings}
      counts={counts}
    />
  )
}
