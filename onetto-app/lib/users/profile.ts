import { ApiError, apiClient } from '@/lib/api';
import { Result } from '@/shared/result';

export type UpdateProfileInput = {
  firstname: string;
  lastname: string;
  email: string;
};

export type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
  confirmationPassword: string;
};

export function updateMyProfile(input: UpdateProfileInput): Promise<Result<{ message: string; user: UpdateProfileInput & { id: string; accountType: string } }, ApiError>> {
  return apiClient('api/users/me', { method: 'PATCH', body: JSON.stringify(input) });
}

export function changeMyPassword(input: ChangePasswordInput): Promise<Result<{ message: string }, ApiError>> {
  return apiClient('api/users/me/password', { method: 'PATCH', body: JSON.stringify(input) });
}
