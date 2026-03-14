import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Copy, Check, Mail, Wifi, Palette, Phone, Globe, Lock } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface CredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SENHA_PASSWORD = "300400";

export function CredentialsModal({ isOpen, onClose }: CredentialsModalProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === SENHA_PASSWORD) {
      setIsVerified(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
      setPasswordInput("");
      toast({
        description: "Senha incorreta!",
        duration: 2000,
      });
    }
  };

  const handleModalClose = () => {
    setIsVerified(false);
    setPasswordInput("");
    setPasswordError(false);
    onClose();
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast({
      description: `${label} copiado!`,
      duration: 2000,
    });
    setTimeout(() => setCopied(null), 2000);
  };

  const credentials = [
    {
      title: "Gmail - Rodabem",
      icon: Mail,
      gradient: "from-red-500/20 via-red-400/10 to-orange-300/5",
      borderColor: "border-red-300/30 dark:border-red-600/30",
      items: [
        { label: "Email", value: "rodabemesmeraldas@gmail.com" },
        { label: "Senha", value: "35387223" },
      ],
    },
    {
      title: "WiFi",
      icon: Wifi,
      gradient: "from-blue-500/20 via-blue-400/10 to-cyan-300/5",
      borderColor: "border-blue-300/30 dark:border-blue-600/30",
      items: [
        { label: "Rede", value: "Virtual Esmeraldas" },
        { label: "Senha", value: "esmeraldas" },
      ],
    },
    {
      title: "Canva",
      icon: Palette,
      gradient: "from-purple-500/20 via-purple-400/10 to-pink-300/5",
      borderColor: "border-purple-300/30 dark:border-purple-600/30",
      items: [
        { label: "Email", value: "dapr92@yahoo.com.br" },
        { label: "Senha", value: "RODAbem1$" },
      ],
    },
  ];

  const contacts = [
    { name: "Daniel", phone: "31999325341" },
    { name: "Rosinha", phone: "31996265523" },
    { name: "Alda", phone: "31995145026" },
    { name: "Iyed", phone: "31973221932" },
  ];

  if (!isVerified) {
    return (
      <Dialog open={isOpen} onOpenChange={handleModalClose}>
        <DialogContent className="max-w-md neo-extruded border-none p-0 rounded-[32px] overflow-hidden">
          <DialogHeader className="px-8 py-6 border-b border-primary/10">
            <DialogTitle className="flex flex-col items-center gap-4">
              <div className="p-4 inline-flex items-center justify-center neo-inset-deep text-primary rounded-full">
                <Lock className="h-8 w-8" />
              </div>
              <span className="text-2xl font-black text-primary">
                Acesso Protegido
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="px-8 py-6">
            <p className="text-center text-sm text-muted-foreground mb-6 font-medium">
              Esta seção contém informações sensíveis. Por favor, digite a senha para continuar.
            </p>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    setPasswordError(false);
                  }}
                  placeholder="Digite a senha"
                  className={`w-full px-4 py-3 rounded-xl neo-inset border-none transition-all duration-300 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
                    passwordError
                      ? "ring-2 ring-destructive"
                      : ""
                  }`}
                  autoFocus
                  data-testid="input-senha-password"
                />
                {passwordError && (
                  <p className="text-xs text-destructive mt-2 font-bold">
                    Senha incorreta. Tente novamente.
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full neo-btn font-bold text-primary rounded-xl py-3 mt-2"
                data-testid="button-submit-senha"
              >
                Verificar Senha
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleModalClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] neo-extruded border-none p-0 flex flex-col rounded-[32px] overflow-hidden">
        <DialogHeader className="px-8 py-5 border-b border-primary/10 flex-shrink-0">
          <DialogTitle className="text-3xl font-black text-primary text-center">
            Senhas & Contatos
          </DialogTitle>
        </DialogHeader>

        <div className="px-8 py-6 space-y-6 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
          {/* Credentials */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-8 w-2 bg-primary rounded-full"></div>
              <h3 className="text-xl font-bold text-foreground">
                Credenciais de Acesso
              </h3>
            </div>
            <div className="space-y-4">
              {credentials.map((cred) => {
                const Icon = cred.icon;
                return (
                  <div
                    key={cred.title}
                    className="group relative rounded-[1.5rem] neo-btn p-5 transition-all duration-500"
                  >
                    <div className="relative flex items-center gap-4 mb-4">
                      <div className="p-3 neo-inset-deep text-primary rounded-full flex-shrink-0">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h4 className="font-bold text-foreground text-lg">
                        {cred.title}
                      </h4>
                    </div>

                    <div className="relative space-y-3">
                      {cred.items.map((item) => (
                        <div
                          key={item.label}
                          className="neo-inset rounded-2xl p-4 transition-all duration-300"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                              {item.label}
                            </div>
                            <button
                              onClick={() =>
                                copyToClipboard(
                                  item.value,
                                  `${cred.title} - ${item.label}`
                                )
                              }
                              className="p-2.5 rounded-full neo-btn hover:text-primary transition-all duration-300"
                              data-testid={`copy-${cred.title}-${item.label}`}
                            >
                              {copied === `${cred.title} - ${item.label}` ? (
                                <Check className="h-4 w-4 text-primary" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                          <p className="font-sans text-base font-bold text-foreground break-all tracking-tight">
                            {item.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Official Email */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-8 w-2 bg-primary rounded-full"></div>
              <h3 className="text-xl font-bold text-foreground">
                Contato Oficial
              </h3>
            </div>
            <div className="neo-btn rounded-[1.5rem] p-5 transition-all duration-500 group">
              <div className="relative flex items-center gap-4 mb-4">
                <div className="p-3 neo-inset-deep text-primary rounded-full flex-shrink-0">
                  <Globe className="h-5 w-5" />
                </div>
                <h4 className="font-bold text-foreground text-lg">
                  Email da Agência
                </h4>
              </div>

              <div className="relative neo-inset rounded-2xl p-4 transition-all duration-300">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                    Contato
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        "contato@rodabemturismo.com",
                        "Email Oficial"
                      )
                    }
                    className="p-2.5 rounded-full neo-btn hover:text-primary transition-all duration-300"
                    data-testid="copy-email-oficial"
                  >
                    {copied === "Email Oficial" ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="font-sans text-base font-bold text-foreground break-all tracking-tight">
                  contato@rodabemturismo.com
                </p>
              </div>
            </div>
          </section>

          {/* Contacts */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-8 w-2 bg-primary rounded-full"></div>
              <h3 className="text-xl font-bold text-foreground">
                Telefones Corporativos
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {contacts.map((contact) => (
                <div
                  key={contact.phone}
                  className="group relative rounded-[1.5rem] neo-btn p-5 transition-all duration-500"
                >
                  <div className="relative flex items-center gap-4 mb-4">
                    <div className="p-3 neo-inset-deep text-primary rounded-full flex-shrink-0">
                      <Phone className="h-5 w-5" />
                    </div>
                    <p className="font-bold text-foreground text-lg">
                      {contact.name}
                    </p>
                  </div>

                  <div className="relative neo-inset rounded-2xl p-4 transition-all duration-300">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                        Telefone
                      </div>
                      <button
                        onClick={() =>
                          copyToClipboard(contact.phone, contact.name)
                        }
                        className="p-2.5 rounded-full neo-btn hover:text-primary transition-all duration-300"
                        data-testid={`copy-phone-${contact.name}`}
                      >
                        {copied === contact.name ? (
                          <Check className="h-4 w-4 text-primary" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <p className="font-sans text-base font-bold text-foreground break-all tracking-tight">
                      {contact.phone}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
