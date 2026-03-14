import { useEffect, useState, useRef } from "react";
import { useParams } from "wouter";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVerificationSession, useVerifyFacialRecognition } from "@/hooks/use-facial-verification";
import { useAuth } from "@/hooks/use-auth";

export default function VerifyClockOut() {
  const { token } = useParams<{ token: string }>();
  const { data: session, isLoading: loadingSession } = useVerificationSession(token || "");
  const verifyMutation = useVerifyFacialRecognition();
  const { logout } = useAuth();
  
  const [step, setStep] = useState<"camera" | "preview" | "processing" | "success" | "error">("camera");
  const [error, setError] = useState<string>("");
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [logoutCountdown, setLogoutCountdown] = useState(3);

  // Start camera immediately when component mounts
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  // Check session status
  useEffect(() => {
    if (session?.status === "verified") {
      setStep("success");
    } else if (session?.status === "failed") {
      setStep("error");
      setError("Verificação falhou");
    } else if (session?.status === "expired") {
      setStep("error");
      setError("A sessão expirou");
    }
  }, [session]);

  // Auto-logout after successful verification
  useEffect(() => {
    if (step !== "success") return;

    const countdownTimer = setInterval(() => {
      setLogoutCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimer);
          logout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownTimer);
  }, [step, logout]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false,
      });
      
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
        };
      }
    } catch (err) {
      console.error("Camera error:", err);
      setError("Não foi possível acessar a câmera");
      setStep("error");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement("canvas");
    // Reduce resolution for smaller file size while maintaining quality
    const maxWidth = 800;
    const scale = Math.min(1, maxWidth / videoRef.current.videoWidth);
    canvas.width = videoRef.current.videoWidth * scale;
    canvas.height = videoRef.current.videoHeight * scale;
    const ctx = canvas.getContext("2d");
    
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      // Reduce quality slightly for smaller file size
      const photoData = canvas.toDataURL("image/jpeg", 0.7);
      setCapturedPhoto(photoData);
      stopCamera();
      setStep("preview");
    }
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
    setStep("camera");
    startCamera();
  };

  const confirmPhoto = async () => {
    if (!capturedPhoto || !token) return;

    setStep("processing");

    try {
      await verifyMutation.mutateAsync({
        token,
        facial_match_confidence: 95,
        verification_method: "webcam_capture",
        verification_metadata: JSON.stringify({
          captured_at: new Date().toISOString(),
          photo_data_url: capturedPhoto,
        }),
      });

      setStep("success");
    } catch (err: any) {
      console.error("Verification error:", err);
      setError(err.message || "Erro ao registrar saída");
      setStep("error");
    }
  };

  if (loadingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-green-50">
        <Loader2 className="h-12 w-12 animate-spin text-green-600" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-green-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Sessão Inválida</h2>
          <p className="text-gray-600">Esta sessão de verificação não foi encontrada.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Camera Step */}
        {step === "camera" && (
          <div>
            <div className="p-6 bg-green-600 text-white text-center">
              <h1 className="text-2xl font-bold">Registrar Saída</h1>
              <p className="text-green-100 mt-1">Tire uma foto do seu rosto</p>
            </div>
            
            <div className="p-6">
              <div className="relative aspect-square bg-black rounded-xl overflow-hidden mb-6">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-64 h-64 rounded-full border-4 border-white/40"></div>
                </div>
              </div>

              <Button
                onClick={capturePhoto}
                className="w-full bg-green-600 hover:bg-green-700 text-white h-14 text-lg font-semibold rounded-xl"
                data-testid="button-capture"
              >
                Tirar Foto
              </Button>
            </div>
          </div>
        )}

        {/* Preview Step */}
        {step === "preview" && capturedPhoto && (
          <div>
            <div className="p-6 bg-green-600 text-white text-center">
              <h1 className="text-2xl font-bold">Confirme sua foto</h1>
              <p className="text-green-100 mt-1">Está tudo certo?</p>
            </div>
            
            <div className="p-6">
              <div className="aspect-square bg-black rounded-xl overflow-hidden mb-6">
                <img src={capturedPhoto} alt="Preview" className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
              </div>

              <div className="space-y-3">
                <Button
                  onClick={confirmPhoto}
                  className="w-full bg-green-600 hover:bg-green-700 text-white h-14 text-lg font-semibold rounded-xl"
                  data-testid="button-confirm"
                >
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Confirmar e Registrar Saída
                </Button>
                <Button
                  onClick={retakePhoto}
                  variant="outline"
                  className="w-full h-12 rounded-xl"
                  data-testid="button-retake"
                >
                  Tirar Outra Foto
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Processing Step */}
        {step === "processing" && (
          <div className="p-12 text-center">
            <Loader2 className="h-16 w-16 animate-spin text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Processando...</h2>
            <p className="text-gray-600">Registrando sua saída</p>
          </div>
        )}

        {/* Success Step */}
        {step === "success" && (
          <div className="p-12 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Sucesso!</h2>
            <p className="text-xl text-gray-600 mb-6">Sua saída foi registrada</p>
            {capturedPhoto && (
              <div className="w-32 h-32 mx-auto rounded-xl overflow-hidden border-4 border-green-500">
                <img src={capturedPhoto} alt="Success" className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
              </div>
            )}
            <div className="mt-8 p-4 bg-green-50 rounded-lg">
              <p className="text-gray-700 font-medium">
                Desconectando em <span className="text-green-600 font-bold text-lg">{logoutCountdown}</span>s...
              </p>
            </div>
          </div>
        )}

        {/* Error Step */}
        {step === "error" && (
          <div className="p-12 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-12 w-12 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Erro</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button
              onClick={retakePhoto}
              className="bg-green-600 hover:bg-green-700 text-white rounded-xl"
            >
              Tentar Novamente
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
