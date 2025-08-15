import { Sword } from 'lucide-react';
import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <div
      className="flex items-center justify-center min-h-screen bg-background p-4 sm:p-6 lg:p-8"
      style={{
        backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Web%20Backgrounds%2FChatGPT%20Image%20Aug%2014%2C%202025%2C%2009_44_22%20PM.png?alt=media&token=cb2379fa-3333-44f9-b4fb-b4a72672a312')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <Sword className="h-10 w-10 text-primary" />
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
