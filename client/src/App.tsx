import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Router, Route, Switch, useLocation } from "wouter";
import { AuthProvider } from "@/components/auth/auth-provider";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { VadminRoute, AdminRoute } from "@/components/auth/role-based-route";
import { Sidebar } from "@/components/layout/sidebar";
import { Watermark } from "@/components/ui/watermark";
import { useDataPreloader } from "@/hooks/use-data-preloader";
import { useInactivityLogout } from "@/hooks/use-inactivity-logout";
import { TutorialProvider } from "@/contexts/TutorialContext";
import { DiscountApprovalNotification } from "@/components/discount-approval-notification";
import { AssistantChat, AssistantButton } from "@/components/assistant/assistant-chat";
import { lazy, Suspense, useState } from "react";

// Lazy load all pages for better performance and faster initial loading
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Clients = lazy(() => import("@/pages/clients"));
const Destinations = lazy(() => import("@/pages/destinations"));
const Buses = lazy(() => import("@/pages/buses"));
const Reports = lazy(() => import("@/pages/reports"));
const Caixa = lazy(() => import("@/pages/caixa"));
const AuthPage = lazy(() => import("@/pages/auth"));
const SignupPage = lazy(() => import("@/pages/signup"));
const AddClient = lazy(() => import("@/pages/add-client"));
const EditClient = lazy(() => import("@/pages/edit-client"));
const ClientApproval = lazy(() => import("@/pages/client-approval"));
const PdfDownload = lazy(() => import("@/pages/pdf-download"));
const Prospects = lazy(() => import("@/pages/prospects"));
const AddProspect = lazy(() => import("@/pages/add-prospect"));
const EditProspect = lazy(() => import("@/pages/edit-prospect"));
const QuoteView = lazy(() => import("@/pages/quote-view"));
const SeatSelection = lazy(() => import("@/pages/seat-selection"));
const ThankYou = lazy(() => import("@/pages/thank-you"));
const UserActivity = lazy(() => import("@/pages/user-activity"));
const Manual = lazy(() => import("@/pages/manual"));
const Receipts = lazy(() => import("@/pages/receipts"));
const Parcelas = lazy(() => import("@/pages/parcelas"));
const ProgramaViagens = lazy(() => import("@/pages/programa-viagens"));
const OrganizationalStructure = lazy(() => import("@/pages/organizational-structure"));
const ControleDePonto = lazy(() => import("@/pages/controle-de-ponto"));
const VerifyClockOut = lazy(() => import("@/pages/verify-clockout"));
const ClientHistory = lazy(() => import("@/pages/client-history"));
const Indicacoes = lazy(() => import("@/pages/indicacoes"));
const ClientInvitation = lazy(() => import("@/pages/client-invitation"));
const CRM = lazy(() => import("@/pages/crm"));
const Administrativo = lazy(() => import("@/pages/administrativo"));
const CrmCalendar = lazy(() => import("@/pages/crm-calendar"));
const Funcionarios = lazy(() => import("@/pages/funcionarios"));
const ClientDataQualityReport = lazy(() => import("@/pages/client-data-quality-report"));
const CancelledCredits = lazy(() => import("@/pages/cancelled-credits"));
const ClientBirthdays = lazy(() => import("@/pages/client-birthdays"));
const DeletedClients = lazy(() => import("@/pages/deleted-clients"));
const InactiveClients = lazy(() => import("@/pages/inactive-clients"));
const SystemHealth = lazy(() => import("@/pages/system-health"));
const AddInactiveClient = lazy(() => import("@/pages/add-inactive-client"));
const EditInactiveClient = lazy(() => import("@/pages/edit-inactive-client"));
const NotFound = lazy(() => import("@/pages/not-found"));

// Loading component for Suspense fallback
function PageLoading() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

// Data preloader component that runs inside the app
function DataPreloader() {
  useDataPreloader(); // This hook handles all the data preloading
  useInactivityLogout(); // Auto-logout after 15 minutes of inactivity to save costs
  return null; // This component doesn't render anything
}

function AppContent() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [location] = useLocation();
  
  // Hide watermark and AI assistant on invitation pages and approval pages
  const isInvitationPage = location.startsWith('/invite/');
  const isApprovalPage = location.startsWith('/approve/');
  const shouldHideAssistant = isInvitationPage || isApprovalPage;

  return (
    <div className="flex h-screen bg-background">
              <Switch>
                <Route path="/auth">
                  <Suspense fallback={<PageLoading />}>
                    <AuthPage />
                  </Suspense>
                </Route>
                <Route path="/signup">
                  <Suspense fallback={<PageLoading />}>
                    <SignupPage />
                  </Suspense>
                </Route>
                <Route path="/approve/:token">
                  <Suspense fallback={<PageLoading />}>
                    <ClientApproval />
                  </Suspense>
                </Route>
                <Route path="/seat-selection/:token">
                  <Suspense fallback={<PageLoading />}>
                    <SeatSelection />
                  </Suspense>
                </Route>
                <Route path="/thank-you/:token">
                  <Suspense fallback={<PageLoading />}>
                    <ThankYou />
                  </Suspense>
                </Route>
                <Route path="/pdf/:token">
                  <Suspense fallback={<PageLoading />}>
                    <PdfDownload />
                  </Suspense>
                </Route>
                <Route path="/quote/:token">
                  {(params) => (
                    <Suspense fallback={<PageLoading />}>
                      <QuoteView params={params} />
                    </Suspense>
                  )}
                </Route>
                <Route path="/invite/:linkId">
                  <Suspense fallback={<PageLoading />}>
                    <ClientInvitation />
                  </Suspense>
                </Route>
                <Route path="/verify-clockout/:token">
                  <Suspense fallback={<PageLoading />}>
                    <VerifyClockOut />
                  </Suspense>
                </Route>
                <Route>
                  <ProtectedRoute>
                    <Sidebar />
                    <main className="flex-1 overflow-auto">
                      <Suspense fallback={<PageLoading />}>
                        <Switch>
                          {/* Routes accessible to both admin and vadmin */}
                          <Route path="/" component={Dashboard} />
                          <Route path="/clients">
                            <AdminRoute>
                              <Clients />
                            </AdminRoute>
                          </Route>
                          <Route path="/clients/new">
                            <AdminRoute>
                              <AddClient />
                            </AdminRoute>
                          </Route>
                          <Route path="/clients/:id/edit">
                            <AdminRoute>
                              <EditClient />
                            </AdminRoute>
                          </Route>
                          <Route path="/client-history">
                            <AdminRoute>
                              <ClientHistory />
                            </AdminRoute>
                          </Route>
                          <Route path="/indicacoes">
                            <AdminRoute>
                              <Indicacoes />
                            </AdminRoute>
                          </Route>
                          <Route path="/prospects">
                            <AdminRoute>
                              <Prospects />
                            </AdminRoute>
                          </Route>
                          <Route path="/prospects/new">
                            <AdminRoute>
                              <AddProspect />
                            </AdminRoute>
                          </Route>
                          <Route path="/prospects/:id/edit">
                            {(params) => (
                              <AdminRoute>
                                <EditProspect params={params} />
                              </AdminRoute>
                            )}
                          </Route>
                          <Route path="/manual">
                            <AdminRoute>
                              <Manual />
                            </AdminRoute>
                          </Route>
                          
                          {/* Routes accessible only to vadmin */}
                          <Route path="/destinations">
                            <AdminRoute>
                              <Destinations />
                            </AdminRoute>
                          </Route>
                          <Route path="/buses">
                            <AdminRoute>
                              <Buses />
                            </AdminRoute>
                          </Route>
                          <Route path="/reports">
                            <VadminRoute>
                              <Reports />
                            </VadminRoute>
                          </Route>
                          <Route path="/caixa">
                            <AdminRoute>
                              <Caixa />
                            </AdminRoute>
                          </Route>
                          <Route path="/receipts">
                            <AdminRoute>
                              <Receipts />
                            </AdminRoute>
                          </Route>
                          <Route path="/parcelas">
                            <AdminRoute>
                              <Parcelas />
                            </AdminRoute>
                          </Route>
                          <Route path="/programa-viagens">
                            <AdminRoute>
                              <ProgramaViagens />
                            </AdminRoute>
                          </Route>
                          <Route path="/organizational-structure">
                            <AdminRoute>
                              <OrganizationalStructure />
                            </AdminRoute>
                          </Route>
                          <Route path="/controle-de-ponto">
                            <AdminRoute>
                              <ControleDePonto />
                            </AdminRoute>
                          </Route>
                          <Route path="/user-activity">
                            <VadminRoute>
                              <UserActivity />
                            </VadminRoute>
                          </Route>
                          <Route path="/crm">
                            <AdminRoute>
                              <CRM />
                            </AdminRoute>
                          </Route>
                          <Route path="/administrativo">
                            <AdminRoute>
                              <Administrativo />
                            </AdminRoute>
                          </Route>
                          <Route path="/crm/calendar">
                            <AdminRoute>
                              <CrmCalendar />
                            </AdminRoute>
                          </Route>
                          <Route path="/funcionarios">
                            <AdminRoute>
                              <Funcionarios />
                            </AdminRoute>
                          </Route>
                          <Route path="/client-data-quality-report">
                            <AdminRoute>
                              <ClientDataQualityReport />
                            </AdminRoute>
                          </Route>
                          <Route path="/system-health">
                            <AdminRoute>
                              <SystemHealth />
                            </AdminRoute>
                          </Route>
                          <Route path="/creditos">
                            <AdminRoute>
                              <CancelledCredits />
                            </AdminRoute>
                          </Route>
                          <Route path="/client-birthdays">
                            <AdminRoute>
                              <ClientBirthdays />
                            </AdminRoute>
                          </Route>
                          <Route path="/deleted-clients">
                            <VadminRoute>
                              <DeletedClients />
                            </VadminRoute>
                          </Route>
                          <Route path="/inactive-clients">
                            <AdminRoute>
                              <InactiveClients />
                            </AdminRoute>
                          </Route>
                          <Route path="/inactive-clients/new">
                            <AdminRoute>
                              <AddInactiveClient />
                            </AdminRoute>
                          </Route>
                          <Route path="/inactive-clients/:id/edit">
                            <AdminRoute>
                              <EditInactiveClient />
                            </AdminRoute>
                          </Route>
                          
                          <Route component={NotFound} />
                        </Switch>
                      </Suspense>
                    </main>
                  </ProtectedRoute>
                </Route>
              </Switch>
              
              {/* VuroDev Watermark - hidden on invitation pages */}
              {!isInvitationPage && (
                <Watermark 
                  text="VuroDev" 
                  subtitle="Designed by Iyed Jebara" 
                />
              )}
              
              {/* Discount approval notification for vadmins */}
              <DiscountApprovalNotification />
              
              {/* AI Assistant - Barbara - temporarily hidden
              {!shouldHideAssistant && (
                <>
                  <AssistantButton onClick={() => setIsChatOpen(true)} />
                  <AssistantChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
                </>
              )}
              */}
            </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <TutorialProvider>
          <AuthProvider>
            {/* COST CUT: Removed DataPreloader - was causing massive API spike on login */}
            <Router>
              <AppContent />
            </Router>
          </AuthProvider>
          <Toaster />
        </TutorialProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
