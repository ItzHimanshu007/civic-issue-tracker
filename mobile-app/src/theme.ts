import { DefaultTheme } from 'react-native-paper';

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#2E7D32', // Green for civic/environmental theme
    secondary: '#1976D2', // Blue
    accent: '#FF6F00', // Orange for urgent issues
    background: '#FAFAFA',
    surface: '#FFFFFF',
    text: '#212121',
    disabled: '#BDBDBD',
    placeholder: '#9E9E9E',
    backdrop: '#000000',
    error: '#D32F2F',
    success: '#388E3C',
    warning: '#F57C00',
    info: '#1976D2',
  },
  fonts: {
    ...DefaultTheme.fonts,
    regular: {
      fontFamily: 'Roboto',
      fontWeight: '400',
    },
    medium: {
      fontFamily: 'Roboto',
      fontWeight: '500',
    },
    light: {
      fontFamily: 'Roboto',
      fontWeight: '300',
    },
    thin: {
      fontFamily: 'Roboto',
      fontWeight: '200',
    },
  },
};
