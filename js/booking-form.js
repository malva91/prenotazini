// Booking Form Component
class BookingForm {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.selectedDate = options.selectedDate;
        this.selectedSlot = options.selectedSlot;
        this.onSuccess = options.onSuccess || (() => {});
        this.onCancel = options.onCancel || (() => {});
        
        this.formData = {
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            notes: ''
        };
        
        this.errors = {};
        this.isSubmitting = false;
        
        this.render();
    }

    render() {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6">
                <div class="mb-6">
                    <h2 class="text-xl font-semibold text-gray-100 mb-2">Completa la prenotazione</h2>
                    <div class="flex items-center space-x-4 text-sm text-gray-400">
                        <div class="flex items-center space-x-1">
                            <i data-lucide="calendar" class="w-4 h-4"></i>
                            <span>${utils.formatDate(this.selectedDate, 'EEEE d MMMM yyyy')}</span>
                        </div>
                        <div class="flex items-center space-x-1">
                            <i data-lucide="clock" class="w-4 h-4"></i>
                            <span>${this.selectedSlot}</span>
                        </div>
                    </div>
                </div>

                <form id="bookingForm" class="space-y-6">
                    <!-- Dati personali -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">
                                <i data-lucide="user" class="w-4 h-4 inline mr-1"></i>
                                Nome *
                            </label>
                            <input type="text" id="firstName" class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-100 placeholder-gray-400" placeholder="Il tuo nome">
                            <div id="firstNameError" class="text-red-400 text-sm mt-1 hidden"></div>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">
                                Cognome *
                            </label>
                            <input type="text" id="lastName" class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-100 placeholder-gray-400" placeholder="Il tuo cognome">
                            <div id="lastNameError" class="text-red-400 text-sm mt-1 hidden"></div>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">
                                <i data-lucide="mail" class="w-4 h-4 inline mr-1"></i>
                                Email *
                            </label>
                            <input type="email" id="email" class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-100 placeholder-gray-400" placeholder="la-tua@email.com">
                            <div id="emailError" class="text-red-400 text-sm mt-1 hidden"></div>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">
                                <i data-lucide="phone" class="w-4 h-4 inline mr-1"></i>
                                Telefono *
                            </label>
                            <input type="tel" id="phone" class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-100 placeholder-gray-400" placeholder="123 456 7890">
                            <div id="phoneError" class="text-red-400 text-sm mt-1 hidden"></div>
                        </div>
                    </div>

                    <!-- Note -->
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">
                            Note aggiuntive
                        </label>
                        <textarea id="notes" class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-100 placeholder-gray-400" rows="3" placeholder="Richieste particolari o informazioni aggiuntive"></textarea>
                    </div>

                    <!-- Anti-bot -->
                    <div class="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
                        <label class="block text-sm font-medium text-gray-300 mb-2">
                            <i data-lucide="shield" class="w-4 h-4 inline mr-1"></i>
                            Verifica anti-bot *
                        </label>
                        <div class="flex items-center space-x-2">
                            <span class="text-sm text-gray-400">3 + 4 = ?</span>
                            <input type="text" id="antiBot" class="w-20 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-center text-gray-100" placeholder="?">
                        </div>
                        <div id="antiBotError" class="text-red-400 text-sm mt-1 hidden"></div>
                    </div>

                    <!-- Terms and conditions -->
                    <div>
                        <label class="flex items-start space-x-2">
                            <input type="checkbox" id="acceptedTerms" class="mt-1 bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500">
                            <span class="text-sm text-gray-400">
                                Accetto i 
                                <a href="#" class="text-blue-400 hover:underline">termini e condizioni</a>
                                e l'informativa sulla 
                                <a href="#" class="text-blue-400 hover:underline">privacy</a>
                                *
                            </span>
                        </label>
                        <div id="termsError" class="text-red-400 text-sm mt-1 hidden"></div>
                    </div>

                    <!-- Actions -->
                    <div class="flex flex-col sm:flex-row gap-3 pt-4">
                        <button type="submit" id="submitButton" class="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors duration-200 font-medium">
                            Conferma prenotazione
                        </button>
                        
                        <button type="button" id="cancelButton" class="flex-1 sm:flex-none sm:px-6 bg-gray-600 text-gray-200 py-3 px-6 rounded-lg hover:bg-gray-500 transition-colors duration-200">
                            Annulla
                        </button>
                    </div>
                </form>
            </div>
        `;

        this.attachEventListeners();
        lucide.createIcons();
    }

    attachEventListeners() {
        const form = document.getElementById('bookingForm');
        const cancelButton = document.getElementById('cancelButton');

        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        if (cancelButton) {
            cancelButton.addEventListener('click', () => this.onCancel());
        }

        // Input event listeners for real-time validation
        ['firstName', 'lastName', 'email', 'phone', 'antiBot'].forEach(field => {
            const input = document.getElementById(field);
            if (input) {
                input.addEventListener('input', () => this.clearError(field));
            }
        });

        const termsCheckbox = document.getElementById('acceptedTerms');
        if (termsCheckbox) {
            termsCheckbox.addEventListener('change', () => this.clearError('terms'));
        }
    }

    validateForm() {
        this.errors = {};

        // Get form values
        this.formData.firstName = document.getElementById('firstName').value.trim();
        this.formData.lastName = document.getElementById('lastName').value.trim();
        this.formData.email = document.getElementById('email').value.trim();
        this.formData.phone = document.getElementById('phone').value.trim();
        this.formData.notes = document.getElementById('notes').value.trim();

        const antiBotAnswer = document.getElementById('antiBot').value.trim();
        const acceptedTerms = document.getElementById('acceptedTerms').checked;

        // Validation
        if (!this.formData.firstName) {
            this.errors.firstName = 'Il nome è obbligatorio';
        }

        if (!this.formData.lastName) {
            this.errors.lastName = 'Il cognome è obbligatorio';
        }

        if (!this.formData.email) {
            this.errors.email = "L'email è obbligatoria";
        } else if (!utils.validateEmail(this.formData.email)) {
            this.errors.email = "Inserisci un'email valida";
        }

        if (!this.formData.phone) {
            this.errors.phone = 'Il telefono è obbligatorio';
        } else if (!utils.validatePhone(this.formData.phone)) {
            this.errors.phone = 'Inserisci un numero di telefono valido';
        }

        if (antiBotAnswer !== '7') {
            this.errors.antiBot = 'Risposta non corretta';
        }

        if (!acceptedTerms) {
            this.errors.terms = 'Devi accettare i termini e condizioni';
        }

        this.displayErrors();
        return Object.keys(this.errors).length === 0;
    }

    displayErrors() {
        // Clear all errors first
        ['firstName', 'lastName', 'email', 'phone', 'antiBot', 'terms'].forEach(field => {
            this.clearError(field);
        });

        // Display new errors
        Object.keys(this.errors).forEach(field => {
            this.showError(field, this.errors[field]);
        });
    }

    showError(field, message) {
        const errorElement = document.getElementById(`${field}Error`);
        const inputElement = document.getElementById(field === 'terms' ? 'acceptedTerms' : field);

        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.remove('hidden');
        }

        if (inputElement && field !== 'terms') {
            inputElement.classList.add('border-red-500');
            inputElement.classList.remove('border-gray-600');
        }
    }

    clearError(field) {
        const errorElement = document.getElementById(`${field}Error`);
        const inputElement = document.getElementById(field === 'terms' ? 'acceptedTerms' : field);

        if (errorElement) {
            errorElement.classList.add('hidden');
        }

        if (inputElement && field !== 'terms') {
            inputElement.classList.remove('border-red-500');
            inputElement.classList.add('border-gray-600');
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        if (!this.validateForm()) {
            return;
        }

        this.isSubmitting = true;
        this.updateSubmitButton(true);

        try {
            const booking = {
                id: utils.generateUUID(),
                firstName: this.formData.firstName,
                lastName: this.formData.lastName,
                email: this.formData.email,
                phone: this.formData.phone,
                date: utils.formatDate(this.selectedDate, 'yyyy-MM-dd'),
                timeSlot: this.selectedSlot,
                status: 'pending',
                createdAt: new Date(),
                updatedAt: new Date(),
                notes: this.formData.notes,
                duration: 30
            };

            const result = await storageManager.saveBooking(booking);

            if (result.success) {
                console.log('New booking created:', booking.id);
                notificationManager.bookingCreated(booking.id);
                this.onSuccess();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Failed to create booking:', error);
            notificationManager.error(
                'Errore prenotazione',
                'Impossibile creare la prenotazione. Riprova più tardi.'
            );
        } finally {
            this.isSubmitting = false;
            this.updateSubmitButton(false);
        }
    }

    updateSubmitButton(loading) {
        const button = document.getElementById('submitButton');
        if (!button) return;

        if (loading) {
            button.disabled = true;
            button.innerHTML = `
                <div class="flex items-center justify-center space-x-2">
                    <div class="loading"></div>
                    <span>Prenotazione in corso...</span>
                </div>
            `;
        } else {
            button.disabled = false;
            button.innerHTML = 'Conferma prenotazione';
        }
    }
}