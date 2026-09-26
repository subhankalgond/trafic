import { FormEvent, useState } from 'react';
import { User as UserIcon, KeyRound } from 'lucide-react';
import { Card, SectionTitle, Button, Input, Badge } from '../components/ui';
import { authService } from '../services/services';
import { ApiRequestError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function ProfilePage() {
  const { user } = useAuth();
  const toast = useToast();

  const [profile, setProfile] = useState({ name: user?.name ?? '', phone: user?.phone ?? '' });
  const [profileFields, setProfileFields] = useState<Record<string, string>>({});
  const [savingProfile, setSavingProfile] = useState(false);

  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '' });
  const [pwdFields, setPwdFields] = useState<Record<string, string>>({});
  const [savingPwd, setSavingPwd] = useState(false);

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setProfileFields({});
    setSavingProfile(true);
    try {
      await authService.updateProfile(profile);
      toast('success', 'Profile updated successfully.');
    } catch (err) {
      const apiErr = err as ApiRequestError;
      setProfileFields(apiErr.fields ?? {});
      toast('error', apiErr.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPwdFields({});
    setSavingPwd(true);
    try {
      const { message } = await authService.changePassword(pwd);
      toast('success', message);
      setPwd({ currentPassword: '', newPassword: '' });
    } catch (err) {
      const apiErr = err as ApiRequestError;
      setPwdFields(apiErr.fields ?? {});
      toast('error', apiErr.message);
    } finally {
      setSavingPwd(false);
    }
  };

  if (!user) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 lg:px-8">
      <h1 className="text-2xl font-extrabold text-white">Profile</h1>
      <p className="mt-1 text-sm text-slate-400">Manage your account details and password.</p>

      <Card className="mt-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-500/15 text-lg font-bold text-sky-300">
            {user.name.charAt(0).toUpperCase()}
          </span>
          <div>
            <p className="font-semibold text-white">{user.name}</p>
            <p className="text-sm text-slate-400">{user.email}</p>
          </div>
          <Badge tone={user.role === 'admin' ? 'red' : user.role === 'operator' ? 'blue' : 'gray'}>
            {user.role.toUpperCase()}
          </Badge>
        </div>

        <form className="space-y-4" onSubmit={saveProfile} noValidate>
          <SectionTitle>Account details</SectionTitle>
          <Input
            label="Full name"
            required
            value={profile.name}
            error={profileFields.name}
            onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
          />
          <Input
            label="Phone"
            required
            type="tel"
            value={profile.phone}
            error={profileFields.phone}
            onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
          />
          <Button type="submit" loading={savingProfile}>
            <UserIcon className="h-4 w-4" aria-hidden /> Save profile
          </Button>
        </form>
      </Card>

      <Card className="mt-6">
        <form className="space-y-4" onSubmit={savePassword} noValidate>
          <SectionTitle sub="Use at least 8 characters with a letter and a number.">Change password</SectionTitle>
          <Input
            label="Current password"
            type="password"
            required
            autoComplete="current-password"
            value={pwd.currentPassword}
            error={pwdFields.currentPassword}
            onChange={(e) => setPwd((p) => ({ ...p, currentPassword: e.target.value }))}
          />
          <Input
            label="New password"
            type="password"
            required
            autoComplete="new-password"
            value={pwd.newPassword}
            error={pwdFields.newPassword}
            onChange={(e) => setPwd((p) => ({ ...p, newPassword: e.target.value }))}
          />
          <Button type="submit" loading={savingPwd}>
            <KeyRound className="h-4 w-4" aria-hidden /> Update password
          </Button>
        </form>
      </Card>
    </div>
  );
}
