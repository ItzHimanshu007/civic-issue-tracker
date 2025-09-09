import { User } from '../types';

const API_BASE_URL = 'http://localhost:3001/api';

export const loginWithPhoneNumber = async (phoneNumber: string) => {
  // TODO: Implement API call
  return { success: true, message: 'OTP sent' };
};

export const verifyOTP = async (phoneNumber: string, otp: string): Promise<User> => {
  // TODO: Implement API call
  return {
    id: '1',
    name: 'John Doe',
    phoneNumber,
    email: 'john@example.com',
    isVerified: true,
    points: 150,
    badges: [],
    createdAt: new Date().toISOString(),
  };
};

export const loginWithGoogle = async (): Promise<User> => {
  // TODO: Implement Google OAuth
  return {
    id: '1',
    name: 'John Doe',
    phoneNumber: '+1234567890',
    email: 'john@example.com',
    isVerified: true,
    points: 150,
    badges: [],
    createdAt: new Date().toISOString(),
  };
};

export const logout = async () => {
  // TODO: Implement logout
  return { success: true };
};

export const updateProfile = async (profileData: Partial<User>): Promise<User> => {
  // TODO: Implement profile update
  return {
    id: '1',
    name: profileData.name || 'John Doe',
    phoneNumber: '+1234567890',
    email: profileData.email || 'john@example.com',
    isVerified: true,
    points: 150,
    badges: [],
    createdAt: new Date().toISOString(),
  };
};
