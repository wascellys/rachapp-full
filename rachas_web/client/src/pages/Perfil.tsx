import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FaUser,
  FaEnvelope,
  FaPhone,
  FaFutbol,
  FaSave,
  FaCamera,
} from "react-icons/fa";
import { toast } from "sonner";
import { ImageCropper } from "@/components/ImageCropper";
import { Skeleton } from "@/components/ui/skeleton";

export default function Perfil() {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    telefone: "",
    posicao: "",
    imagem_perfil: null as File | null,
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [removeBg, setRemoveBg] = useState(false);
  const [croppingImage, setCroppingImage] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        email: user.email || "",
        telefone: user.telefone || "",
        posicao: user.posicao || "MEIA",
        imagem_perfil: null,
      });
      setPreviewUrl(user.imagem_perfil || null);
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSelectChange = (value: string) => {
    setFormData({ ...formData, posicao: value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setCroppingImage(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      // Reset input value so same file can be selected again if cancelled
      e.target.value = "";
    }
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    // Create a File from the Blob
    const timestamp = new Date().getTime();
    const username = user?.username || "user";
    const file = new File([croppedBlob], `profile-pic-${username}-${timestamp}.jpg`, { type: "image/jpeg" });
    
    setFormData({ ...formData, imagem_perfil: file });

    // Update preview
    const objectUrl = URL.createObjectURL(croppedBlob);
    setPreviewUrl(objectUrl);
    
    // Close cropper
    setCroppingImage(null);
  };

  const handleCropCancel = () => {
    setCroppingImage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = new FormData();
      data.append("first_name", formData.first_name);
      data.append("last_name", formData.last_name);
      data.append("email", formData.email);
      data.append("telefone", formData.telefone);
      data.append("posicao", formData.posicao);

      if (formData.imagem_perfil) {
        data.append("imagem_perfil", formData.imagem_perfil);
        if (removeBg) {
          data.append("remove_bg", "true");
        }
      }

      await api.patch("/usuarios/me/", data, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      await refreshUser();
      toast.success("Perfil atualizado com sucesso!");
    } catch (error: any) {
      console.error("Erro ao atualizar perfil:", error);
      toast.error("Erro ao atualizar perfil. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 p-8">
        <div className="flex items-center gap-4 mb-8">
           <Skeleton className="h-10 w-10 rounded-full" />
           <div className="space-y-2">
             <Skeleton className="h-8 w-48" />
             <Skeleton className="h-4 w-64" />
           </div>
        </div>
        <div className="grid gap-6">
           <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FaUser className="text-primary w-6 h-6" />
            </div>
            <CardTitle className="text-2xl">Meu Perfil</CardTitle>
          </div>
          <CardDescription>
            Gerencie suas informações pessoais e preferências de jogo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form id="perfil-form" onSubmit={handleSubmit} className="space-y-8">
            {/* Foto de Perfil */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative group cursor-pointer">
                <Avatar className="w-32 h-32 border-4 border-background shadow-xl rounded-full bg-background">
                  <AvatarImage
                    src={previewUrl || undefined}
                    className="object-cover"
                  />
                  <AvatarFallback className="text-4xl bg-muted">
                    {user.username.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <label
                  htmlFor="foto-upload"
                  className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <FaCamera className="text-white w-8 h-8" />
                </label>
                <input
                  id="foto-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Clique na foto para alterar
              </p>
              
              {formData.imagem_perfil && (
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="remove-bg" 
                    checked={removeBg} 
                    onCheckedChange={(checked) => setRemoveBg(checked as boolean)} 
                  />
                  <Label htmlFor="remove-bg" className="cursor-pointer">
                    Remover fundo da imagem (IA)
                  </Label>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="first_name">Nome</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  placeholder="Seu primeiro nome"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name">Sobrenome</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  placeholder="Seu sobrenome"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <div className="relative">
                  <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="pl-10"
                    placeholder="seu@email.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone / WhatsApp</Label>
                <div className="relative">
                  <FaPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={handleChange}
                    className="pl-10"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="posicao">Posição Preferida</Label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                    <FaFutbol className="text-muted-foreground" />
                  </div>
                  <Select
                    value={formData.posicao}
                    onValueChange={handleSelectChange}
                  >
                    <SelectTrigger className="pl-10">
                      <SelectValue placeholder="Selecione sua posição" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GOLEIRO">Goleiro</SelectItem>
                      <SelectItem value="ZAGUEIRO">Zagueiro</SelectItem>
                      <SelectItem value="LATERAL">Lateral</SelectItem>
                      <SelectItem value="VOLANTE">Volante</SelectItem>
                      <SelectItem value="MEIA">Meia</SelectItem>
                      <SelectItem value="ATACANTE">Atacante</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex justify-end border-t pt-6">
          <Button
            type="submit"
            form="perfil-form"
            disabled={loading}
            className="min-w-[150px]"
          >
            {loading ? (
              "Salvando..."
            ) : (
              <>
                <FaSave className="mr-2" /> Salvar Alterações
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      {/* Image Cropper Modal */}
      {croppingImage && (
        <ImageCropper
          imageSrc={croppingImage}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
          aspect={1} // Square crop for profile picture
        />
      )}
    </div>
  );
}
