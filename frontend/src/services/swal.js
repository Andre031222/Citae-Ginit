// SweetAlert2 preconfigurado con el tema macOS de Citae.
// Importar este módulo en lugar de usar toast directamente.

import Swal from 'sweetalert2';

// Toast ligero (esquina superior derecha, se cierra solo)
export const Toast = Swal.mixin({
  toast:             true,
  position:          'top-end',
  showConfirmButton: false,
  timer:             2800,
  timerProgressBar:  true,
  customClass: {
    popup:         'swal-citae-toast',
    timerProgressBar: 'swal-citae-bar',
  },
  didOpen: (toast) => {
    toast.addEventListener('mouseenter', Swal.stopTimer);
    toast.addEventListener('mouseleave', Swal.resumeTimer);
  },
});

// Modal centrado (para errores o confirmaciones)
export const Modal = Swal.mixin({
  customClass: {
    popup:            'swal-citae-modal',
    title:            'swal-citae-title',
    htmlContainer:    'swal-citae-body',
    confirmButton:    'swal-citae-confirm',
    cancelButton:     'swal-citae-cancel',
  },
  buttonsStyling: false,
});

export const notify = {
  success: (title, text) =>
    Toast.fire({ icon: 'success', title, text }),

  error: (title, text) =>
    Modal.fire({ icon: 'error', title: title || 'Error', text }),

  warning: (title, text) =>
    Toast.fire({ icon: 'warning', title, text }),

  info: (title, text) =>
    Toast.fire({ icon: 'info', title, text }),

  confirm: ({ title, text, confirmText = 'Confirmar', cancelText = 'Cancelar' }) =>
    Modal.fire({
      title,
      text,
      icon:                 'question',
      showCancelButton:     true,
      confirmButtonText:    confirmText,
      cancelButtonText:     cancelText,
      reverseButtons:       true,
    }),
};

export default notify;
