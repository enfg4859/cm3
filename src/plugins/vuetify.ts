import '@mdi/font/css/materialdesignicons.css';
import 'vuetify/styles';
import { createVuetify } from 'vuetify';
import { aliases, mdi } from 'vuetify/iconsets/mdi';

const vuetify = createVuetify({
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: { mdi }
  },
  defaults: {
    VBtn: {
      rounded: 'lg',
      variant: 'text'
    },
    VCard: {
      rounded: 'xl'
    },
    VTextField: {
      hideDetails: true,
      variant: 'solo-filled',
      flat: true
    },
    VSwitch: {
      hideDetails: true,
      inset: true,
      density: 'comfortable'
    }
  },
  theme: {
    defaultTheme: 'quantAtelier',
    themes: {
      quantAtelier: {
        dark: true,
        colors: {
          background: '#0b1326',
          surface: '#131b2e',
          'surface-bright': '#31394d',
          primary: '#c0c1ff',
          secondary: '#4edea3',
          accent: '#8083ff',
          error: '#ff516a',
          info: '#c7c4d7',
          success: '#4edea3'
        }
      }
    }
  }
});

export default vuetify;
