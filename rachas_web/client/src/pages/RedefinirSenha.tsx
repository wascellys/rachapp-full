import { useState } from 'react';
import { useRoute, useLocation, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { FaFutbol, FaCheckCircle } from 'react-icons/fa';
import { auth } from '@/lib/api';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function RedefinirSenha() {
    const [match, params] = useRoute('/redefinir-senha/:uid/:token');
    const [, setLocation] = useLocation();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Se não bater a rota certinha com uid/token, exibe erro genérico
    if (!match || !params?.uid || !params?.token) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="text-destructive">Link Inválido</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>Este link de redefinição de senha é inválido ou está incompleto.</p>
                    </CardContent>
                    <CardFooter>
                        <Link href="/login" className="text-primary hover:underline">Voltar para o login</Link>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    const { uid, token } = params;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('As senhas não coincidem. Tente novamente.');
            return;
        }

        if (password.length < 8) {
            setError('A nova senha deve ter pelo menos 8 caracteres.');
            return;
        }

        setLoading(true);

        try {
            await auth.passwordResetConfirm({
                uid,
                token,
                new_password1: password,
                new_password2: confirmPassword
            });

            setSuccess(true);
            toast.success("Senha atualizada!", {
                description: "Sua senha foi redefinida com sucesso. Você já pode fazer login.",
            });

            // Opcional: redirecionar para o login após X segundos
            setTimeout(() => {
                setLocation('/login');
            }, 5000);

        } catch (err: any) {
            console.error(err);
            if (err.response?.data?.token) {
                setError('O token de redefinição expirou ou é inválido. Por favor, solicite um novo link.');
            } else if (err.response?.data?.new_password1) {
                setError(err.response.data.new_password1[0]);
            } else {
                setError('Ocorreu um erro ao tentar redefinir a senha. Verifique os dados inseridos.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                        <FaFutbol className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Nova Senha</h1>
                    <p className="text-muted-foreground">Defina a sua nova senha de acesso</p>
                </div>

                <Card className="border-border/50 shadow-lg">
                    <CardHeader>
                        <CardTitle>Redefinir Senha</CardTitle>
                        <CardDescription>Crie uma senha forte e segura.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {success ? (
                            <Alert className="bg-green-500/10 text-green-600 border-green-500/50 mt-2">
                                <FaCheckCircle className="h-4 w-4" />
                                <AlertDescription className="ml-2">
                                    Sua senha foi alterada com sucesso! Redirecionando para o login...
                                </AlertDescription>
                            </Alert>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="password">Nova Senha</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword">Confirme a Nova Senha</Label>
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                    />
                                </div>

                                {error && <p className="text-sm text-destructive">{error}</p>}

                                <Button type="submit" className="w-full font-semibold" disabled={loading}>
                                    {loading ? 'Salvando...' : 'Salvar Nova Senha'}
                                </Button>
                            </form>
                        )}
                    </CardContent>
                    <CardFooter className="justify-center">
                        <p className="text-sm text-muted-foreground">
                            Lembrou sua senha? <Link href="/login" className="text-primary hover:underline">Faça login</Link>
                        </p>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
