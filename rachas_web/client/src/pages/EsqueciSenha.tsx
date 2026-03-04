import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { FaFutbol, FaEnvelope } from 'react-icons/fa';
import { Link } from 'wouter';
import { auth } from '@/lib/api';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function EsqueciSenha() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await auth.passwordReset(email);
            setSuccess(true);
            toast.success("E-mail enviado!", {
                description: "Enviamos as instruções para recuperação de senha para o seu e-mail.",
            });
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.email?.[0] || 'Ocorreu um erro ao tentar redefinir sua senha. Verifique o e-mail digitado e tente novamente.');
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
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Recuperar Senha</h1>
                    <p className="text-muted-foreground">Enviaremos um link para você redefinir sua senha</p>
                </div>

                <Card className="border-border/50 shadow-lg">
                    <CardHeader>
                        <CardTitle>Esqueceu a senha?</CardTitle>
                        <CardDescription>Digite o e-mail cadastrado na sua conta.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {success ? (
                            <Alert className="bg-green-500/10 text-green-600 border-green-500/50">
                                <FaEnvelope className="h-4 w-4" />
                                <AlertDescription>
                                    Verifique sua caixa de entrada e a pasta de spam. Enviamos um link para você redefinir sua senha.
                                </AlertDescription>
                            </Alert>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">E-mail</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="seu.email@exemplo.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>

                                {error && <p className="text-sm text-destructive">{error}</p>}

                                <Button type="submit" className="w-full font-semibold" disabled={loading}>
                                    {loading ? 'Enviando...' : 'Enviar link de recuperação'}
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
