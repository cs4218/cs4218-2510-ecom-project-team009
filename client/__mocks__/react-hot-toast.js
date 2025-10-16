export const Toaster = () => null;

export const toast = {
  success: jest.fn(),
  error: jest.fn(),
  loading: jest.fn(),
  custom: jest.fn(),
  promise: jest.fn(),
  dismiss: jest.fn(),
};

export default toast;
