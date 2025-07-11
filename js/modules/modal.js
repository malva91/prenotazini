// Modal management system
export class ModalManager {
    constructor() {
        this.activeModal = null;
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-close')) {
                this.close();
            }
            if (e.target.classList.contains('modal')) {
                this.close();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeModal) {
                this.close();
            }
        });
    }

    open(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('show');
            this.activeModal = modal;
            document.body.style.overflow = 'hidden';
        }
    }

    close() {
        if (this.activeModal) {
            this.activeModal.classList.remove('show');
            this.activeModal = null;
            document.body.style.overflow = '';
        }
    }

    isOpen() {
        return this.activeModal !== null;
    }
}