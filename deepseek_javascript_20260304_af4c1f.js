/**
 * Student Course Registration System
 * Main JavaScript File
 * Version: 1.0.0
 */

// ========================================
// Global Configuration
// ========================================
const CONFIG = {
    API_BASE_URL: '/api',
    TOAST_DURATION: 3000,
    ANIMATION_DURATION: 300,
    ITEMS_PER_PAGE: 10,
    DEFAULT_CURRENCY: 'USD',
    CREDIT_COST: 500,
    MAX_CREDITS_PER_SEMESTER: 18,
    MIN_CREDITS_PER_SEMESTER: 12
};

// ========================================
// State Management
// ========================================
const AppState = {
    currentUser: null,
    currentPage: 'dashboard',
    courses: [],
    students: [],
    registrations: [],
    filters: {
        search: '',
        department: '',
        level: '',
        status: ''
    },
    pagination: {
        currentPage: 1,
        totalPages: 1,
        itemsPerPage: CONFIG.ITEMS_PER_PAGE
    },
    loading: false,
    notifications: []
};

// ========================================
// Utility Functions
// ========================================
const Utils = {
    /**
     * Format date to local string
     */
    formatDate(date, format = 'PP') {
        const d = new Date(date);
        return d.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    /**
     * Format currency
     */
    formatCurrency(amount, currency = CONFIG.DEFAULT_CURRENCY) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(amount);
    },

    /**
     * Generate unique ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    /**
     * Debounce function for search inputs
     */
    debounce(func, wait = 300) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Validate email format
     */
    isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    /**
     * Validate phone number
     */
    isValidPhone(phone) {
        const re = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
        return re.test(phone);
    },

    /**
     * Show loading spinner
     */
    showLoading() {
        AppState.loading = true;
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            spinner.classList.add('show');
        }
    },

    /**
     * Hide loading spinner
     */
    hideLoading() {
        AppState.loading = false;
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            spinner.classList.remove('show');
        }
    },

    /**
     * Get URL parameters
     */
    getUrlParams() {
        const params = new URLSearchParams(window.location.search);
        return Object.fromEntries(params.entries());
    },

    /**
     * Set URL parameters without reload
     */
    setUrlParams(params) {
        const url = new URL(window.location.href);
        Object.entries(params).forEach(([key, value]) => {
            if (value) {
                url.searchParams.set(key, value);
            } else {
                url.searchParams.delete(key);
            }
        });
        window.history.pushState({}, '', url);
    }
};

// ========================================
// Toast Notification System
// ========================================
const Toast = {
    container: null,

    init() {
        this.container = document.getElementById('toastContainer');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'toastContainer';
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        }
    },

    show(title, message, type = 'info', duration = CONFIG.TOAST_DURATION) {
        if (!this.container) this.init();

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        // Icon mapping
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas ${icons[type] || icons.info}"></i>
            </div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" onclick="this.closest('.toast').remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        this.container.appendChild(toast);

        // Trigger animation
        setTimeout(() => toast.classList.add('show'), 10);

        // Auto remove
        if (duration > 0) {
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, duration);
        }

        // Add to notifications list
        AppState.notifications.push({
            id: Utils.generateId(),
            title,
            message,
            type,
            timestamp: new Date()
        });

        return toast;
    },

    success(title, message, duration) {
        return this.show(title, message, 'success', duration);
    },

    error(title, message, duration) {
        return this.show(title, message, 'error', duration);
    },

    warning(title, message, duration) {
        return this.show(title, message, 'warning', duration);
    },

    info(title, message, duration) {
        return this.show(title, message, 'info', duration);
    }
};

// ========================================
// Modal Management
// ========================================
const Modal = {
    modals: {},

    init(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return null;

        const closeBtn = modal.querySelector('.modal-close');
        const overlay = modal.closest('.modal-overlay') || modal;

        this.modals[modalId] = {
            element: modal,
            overlay: overlay.closest('.modal-overlay') || modal,
            closeBtn
        };

        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.close(modalId);
            }
        });

        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen(modalId)) {
                this.close(modalId);
            }
        });

        // Close button
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close(modalId));
        }

        return this.modals[modalId];
    },

    open(modalId) {
        let modal = this.modals[modalId];
        if (!modal) {
            modal = this.init(modalId);
        }
        if (modal) {
            modal.overlay.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    },

    close(modalId) {
        const modal = this.modals[modalId];
        if (modal) {
            modal.overlay.classList.remove('show');
            document.body.style.overflow = '';
        }
    },

    isOpen(modalId) {
        const modal = this.modals[modalId];
        return modal && modal.overlay.classList.contains('show');
    }
};

// ========================================
// Form Validation
// ========================================
const FormValidator = {
    rules: {},

    addRule(fieldId, rules) {
        this.rules[fieldId] = rules;
    },

    validateField(field) {
        const fieldId = field.id || field.name;
        const rules = this.rules[fieldId];
        if (!rules) return true;

        const value = field.value.trim();
        const errors = [];

        rules.forEach(rule => {
            if (rule.required && !value) {
                errors.push(`${field.name || 'This field'} is required`);
            }
            if (rule.minLength && value.length < rule.minLength) {
                errors.push(`Minimum length is ${rule.minLength} characters`);
            }
            if (rule.maxLength && value.length > rule.maxLength) {
                errors.push(`Maximum length is ${rule.maxLength} characters`);
            }
            if (rule.pattern && !rule.pattern.test(value)) {
                errors.push(rule.message || 'Invalid format');
            }
            if (rule.custom && !rule.custom(value)) {
                errors.push(rule.message || 'Invalid value');
            }
        });

        // Update field UI
        const errorElement = document.getElementById(`${fieldId}-error`);
        if (errors.length > 0) {
            field.classList.add('error');
            if (errorElement) {
                errorElement.textContent = errors[0];
            }
        } else {
            field.classList.remove('error');
            field.classList.add('success');
            if (errorElement) {
                errorElement.textContent = '';
            }
        }

        return errors.length === 0;
    },

    validateForm(formId) {
        const form = document.getElementById(formId);
        if (!form) return false;

        const fields = form.querySelectorAll('input, select, textarea');
        let isValid = true;

        fields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });

        return isValid;
    },

    resetForm(formId) {
        const form = document.getElementById(formId);
        if (form) {
            form.reset();
            form.querySelectorAll('.error, .success').forEach(el => {
                el.classList.remove('error', 'success');
            });
        }
    }
};

// ========================================
// API Service (Simulated)
// ========================================
const ApiService = {
    async get(endpoint) {
        Utils.showLoading();
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Mock data based on endpoint
            const mockData = this.getMockData(endpoint);
            
            Utils.hideLoading();
            return { success: true, data: mockData };
        } catch (error) {
            Utils.hideLoading();
            Toast.error('Error', `Failed to fetch data from ${endpoint}`);
            return { success: false, error };
        }
    },

    async post(endpoint, data) {
        Utils.showLoading();
        try {
            await new Promise(resolve => setTimeout(resolve, 500));
            Utils.hideLoading();
            Toast.success('Success', 'Operation completed successfully');
            return { success: true, data: { id: Utils.generateId(), ...data } };
        } catch (error) {
            Utils.hideLoading();
            Toast.error('Error', 'Operation failed');
            return { success: false, error };
        }
    },

    async put(endpoint, data) {
        Utils.showLoading();
        try {
            await new Promise(resolve => setTimeout(resolve, 500));
            Utils.hideLoading();
            Toast.success('Success', 'Update completed successfully');
            return { success: true, data };
        } catch (error) {
            Utils.hideLoading();
            Toast.error('Error', 'Update failed');
            return { success: false, error };
        }
    },

    async delete(endpoint) {
        Utils.showLoading();
        try {
            await new Promise(resolve => setTimeout(resolve, 500));
            Utils.hideLoading();
            Toast.success('Success', 'Delete completed successfully');
            return { success: true };
        } catch (error) {
            Utils.hideLoading();
            Toast.error('Error', 'Delete failed');
            return { success: false, error };
        }
    },

    getMockData(endpoint) {
        const mockData = {
            'courses': [
                { id: 'CS101', name: 'Introduction to Programming', department: 'CS', credits: 3, instructor: 'Dr. Smith', capacity: 30, enrolled: 28 },
                { id: 'CS201', name: 'Data Structures', department: 'CS', credits: 3, instructor: 'Dr. Johnson', capacity: 25, enrolled: 25 },
                { id: 'CS301', name: 'Algorithms', department: 'CS', credits: 4, instructor: 'Dr. Williams', capacity: 20, enrolled: 18 },
                { id: 'ENG101', name: 'Engineering Math', department: 'ENG', credits: 3, instructor: 'Prof. Brown', capacity: 35, enrolled: 32 },
                { id: 'BUS201', name: 'Business Analytics', department: 'BUS', credits: 3, instructor: 'Dr. Davis', capacity: 30, enrolled: 20 }
            ],
            'students': [
                { id: 'S001', name: 'John Doe', email: 'john@university.edu', department: 'CS', year: 3, status: 'Active' },
                { id: 'S002', name: 'Jane Smith', email: 'jane@university.edu', department: 'ENG', year: 2, status: 'Active' },
                { id: 'S003', name: 'Bob Johnson', email: 'bob@university.edu', department: 'BUS', year: 4, status: 'Active' },
                { id: 'S004', name: 'Alice Williams', email: 'alice@university.edu', department: 'ART', year: 1, status: 'Inactive' },
                { id: 'S005', name: 'Charlie Brown', email: 'charlie@university.edu', department: 'CS', year: 3, status: 'Active' }
            ],
            'registrations': [
                { id: 'R001', studentId: 'S001', studentName: 'John Doe', courses: ['CS101', 'CS201'], date: '2024-01-15', status: 'Confirmed' },
                { id: 'R002', studentId: 'S002', studentName: 'Jane Smith', courses: ['ENG101'], date: '2024-01-14', status: 'Pending' },
                { id: 'R003', studentId: 'S003', studentName: 'Bob Johnson', courses: ['BUS201'], date: '2024-01-13', status: 'Confirmed' }
            ]
        };

        return mockData[endpoint] || [];
    }
};

// ========================================
// Dashboard Functions
// ========================================
const Dashboard = {
    async init() {
        await this.loadStats();
        this.initChart();
    },

    async loadStats() {
        const stats = {
            totalStudents: 1234,
            totalCourses: 86,
            totalRegistrations: 2847,
            completionRate: 87
        };

        document.getElementById('totalStudents').textContent = stats.totalStudents;
        document.getElementById('totalCourses').textContent = stats.totalCourses;
        document.getElementById('totalRegistrations').textContent = stats.totalRegistrations;
    },

    initChart() {
        const ctx = document.getElementById('registrationChart')?.getContext('2d');
        if (!ctx) return;

        // Simple bar chart using canvas
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        const data = [65, 59, 80, 81, 56, 55];
        
        ctx.fillStyle = '#4f46e5';
        const barWidth = 40;
        const spacing = 20;
        let x = 40;

        months.forEach((month, index) => {
            const height = data[index] * 2;
            ctx.fillRect(x, 200 - height, barWidth, height);
            
            ctx.fillStyle = '#374151';
            ctx.font = '12px Poppins';
            ctx.fillText(month, x + 10, 220);
            
            ctx.fillStyle = '#4f46e5';
            x += barWidth + spacing;
        });
    }
};

// ========================================
// Course Management
// ========================================
const CourseManager = {
    async loadCourses() {
        const result = await ApiService.get('courses');
        if (result.success) {
            AppState.courses = result.data;
            this.renderCoursesTable();
        }
    },

    renderCoursesTable() {
        const tbody = document.getElementById('coursesTableBody');
        if (!tbody) return;

        const filteredCourses = this.filterCourses(AppState.courses);
        const paginatedCourses = this.paginateCourses(filteredCourses);

        tbody.innerHTML = '';

        paginatedCourses.forEach(course => {
            const row = document.createElement('tr');
            const status = course.enrolled >= course.capacity ? 'Full' : 'Open';
            const statusClass = status === 'Open' ? 'success' : 'error';

            row.innerHTML = `
                <td class="px-6 py-4">${course.id}</td>
                <td class="px-6 py-4">${course.name}</td>
                <td class="px-6 py-4">${course.department}</td>
                <td class="px-6 py-4">${course.credits}</td>
                <td class="px-6 py-4">${course.instructor}</td>
                <td class="px-6 py-4">${course.enrolled}/${course.capacity}</td>
                <td class="px-6 py-4">
                    <span class="table-badge ${statusClass}">${status}</span>
                </td>
                <td class="px-6 py-4">
                    <div class="table-actions">
                        <button class="table-action-btn edit" onclick="CourseManager.editCourse('${course.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="table-action-btn delete" onclick="CourseManager.deleteCourse('${course.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;

            tbody.appendChild(row);
        });

        this.updatePagination(filteredCourses.length);
    },

    filterCourses(courses) {
        const { search, department, level } = AppState.filters;
        
        return courses.filter(course => {
            let matches = true;
            
            if (search) {
                matches = matches && (
                    course.name.toLowerCase().includes(search.toLowerCase()) ||
                    course.id.toLowerCase().includes(search.toLowerCase()) ||
                    course.instructor.toLowerCase().includes(search.toLowerCase())
                );
            }
            
            if (department) {
                matches = matches && course.department === department;
            }
            
            return matches;
        });
    },

    paginateCourses(courses) {
        const { currentPage, itemsPerPage } = AppState.pagination;
        const start = (currentPage - 1) * itemsPerPage;
        return courses.slice(start, start + itemsPerPage);
    },

    updatePagination(totalItems) {
        AppState.pagination.totalPages = Math.ceil(totalItems / AppState.pagination.itemsPerPage);
        
        const info = document.querySelector('.pagination-info');
        if (info) {
            const start = (AppState.pagination.currentPage - 1) * AppState.pagination.itemsPerPage + 1;
            const end = Math.min(start + AppState.pagination.itemsPerPage - 1, totalItems);
            info.textContent = `Showing ${start} to ${end} of ${totalItems} courses`;
        }
    },

    async addCourse(courseData) {
        const result = await ApiService.post('courses', courseData);
        if (result.success) {
            Modal.close('courseModal');
            this.loadCourses();
        }
    },

    async editCourse(courseId) {
        const course = AppState.courses.find(c => c.id === courseId);
        if (course) {
            // Populate form with course data
            Modal.open('courseModal');
        }
    },

    async deleteCourse(courseId) {
        if (confirm('Are you sure you want to delete this course?')) {
            const result = await ApiService.delete(`courses/${courseId}`);
            if (result.success) {
                this.loadCourses();
            }
        }
    }
};

// ========================================
// Student Management
// ========================================
const StudentManager = {
    async loadStudents() {
        const result = await ApiService.get('students');
        if (result.success) {
            AppState.students = result.data;
            this.renderStudentsTable();
        }
    },

    renderStudentsTable() {
        const tbody = document.getElementById('studentsTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        AppState.students.forEach(student => {
            const row = document.createElement('tr');
            const statusClass = student.status === 'Active' ? 'success' : 'neutral';

            row.innerHTML = `
                <td class="px-6 py-4">${student.id}</td>
                <td class="px-6 py-4">${student.name}</td>
                <td class="px-6 py-4">${student.email}</td>
                <td class="px-6 py-4">${student.department}</td>
                <td class="px-6 py-4">${student.year}</td>
                <td class="px-6 py-4">
                    <span class="table-badge ${statusClass}">${student.status}</span>
                </td>
                <td class="px-6 py-4">
                    <div class="table-actions">
                        <button class="table-action-btn edit" onclick="StudentManager.editStudent('${student.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="table-action-btn delete" onclick="StudentManager.deleteStudent('${student.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;

            tbody.appendChild(row);
        });
    },

    async addStudent(studentData) {
        const result = await ApiService.post('students', studentData);
        if (result.success) {
            Modal.close('studentModal');
            this.loadStudents();
        }
    },

    async editStudent(studentId) {
        const student = AppState.students.find(s => s.id === studentId);
        if (student) {
            // Populate form with student data
            Modal.open('studentModal');
        }
    },

    async deleteStudent(studentId) {
        if (confirm('Are you sure you want to delete this student?')) {
            const result = await ApiService.delete(`students/${studentId}`);
            if (result.success) {
                this.loadStudents();
            }
        }
    }
};

// ========================================
// Registration Management
// ========================================
const RegistrationManager = {
    async loadRegistrations() {
        const result = await ApiService.get('registrations');
        if (result.success) {
            AppState.registrations = result.data;
            this.renderRegistrations();
        }
    },

    renderRegistrations() {
        const container = document.getElementById('registrationsContainer');
        if (!container) return;

        container.innerHTML = '';

        AppState.registrations.forEach(reg => {
            const card = document.createElement('div');
            card.className = 'card';
            
            const statusClass = reg.status === 'Confirmed' ? 'success' : 'warning';

            card.innerHTML = `
                <div class="card-body">
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <h4 class="font-semibold">${reg.studentName}</h4>
                            <p class="text-sm text-gray-500">ID: ${reg.studentId}</p>
                        </div>
                        <span class="table-badge ${statusClass}">${reg.status}</span>
                    </div>
                    <div class="mb-4">
                        <p class="text-sm font-medium mb-2">Registered Courses:</p>
                        <div class="flex flex-wrap gap-2">
                            ${reg.courses.map(course => 
                                `<span class="px-2 py-1 bg-primary-100 text-primary-800 text-xs rounded-full">${course}</span>`
                            ).join('')}
                        </div>
                    </div>
                    <div class="flex justify-between items-center text-sm text-gray-500">
                        <span><i class="far fa-calendar mr-1"></i> ${Utils.formatDate(reg.date)}</span>
                        <button class="text-primary-600 hover:text-primary-800" onclick="RegistrationManager.viewRegistration('${reg.id}')">
                            View Details <i class="fas fa-arrow-right ml-1 text-xs"></i>
                        </button>
                    </div>
                </div>
            `;

            container.appendChild(card);
        });
    },

    calculateSummary() {
        const checkboxes = document.querySelectorAll('#registrationForm input[type="checkbox"]:checked');
        const selectedCount = checkboxes.length;
        
        // Calculate credits (assuming each course is 3 credits for demo)
        const credits = selectedCount * 3;
        const fee = credits * CONFIG.CREDIT_COST;

        document.getElementById('selectedCount').textContent = selectedCount;
        document.getElementById('totalCredits').textContent = credits;
        document.getElementById('tuitionFee').textContent = Utils.formatCurrency(fee);
    },

    async submitRegistration(formData) {
        const result = await ApiService.post('registrations', formData);
        if (result.success) {
            Modal.close('registrationModal');
            this.loadRegistrations();
        }
    },

    viewRegistration(regId) {
        Toast.info('Registration Details', `Viewing registration: ${regId}`);
    }
};

// ========================================
// Search and Filter
// ========================================
const SearchFilter = {
    init() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce((e) => {
                AppState.filters.search = e.target.value;
                AppState.pagination.currentPage = 1;
                CourseManager.renderCoursesTable();
            }, 300));
        }

        // Department filter
        const deptFilter = document.getElementById('departmentFilter');
        if (deptFilter) {
            deptFilter.addEventListener('change', (e) => {
                AppState.filters.department = e.target.value;
                AppState.pagination.currentPage = 1;
                CourseManager.renderCoursesTable();
            });
        }
    },

    reset() {
        AppState.filters = {
            search: '',
            department: '',
            level: '',
            status: ''
        };
        
        // Reset form inputs
        document.querySelectorAll('.search-input, .filter-select').forEach(el => {
            if (el.type === 'search' || el.tagName === 'INPUT') {
                el.value = '';
            } else if (el.tagName === 'SELECT') {
                el.selectedIndex = 0;
            }
        });
        
        AppState.pagination.currentPage = 1;
        CourseManager.renderCoursesTable();
    }
};

// ========================================
// Pagination Controls
// ========================================
const PaginationControls = {
    init() {
        this.render();
    },

    render() {
        const container = document.querySelector('.pagination-controls');
        if (!container) return;

        const { currentPage, totalPages } = AppState.pagination;
        
        let html = '';
        
        // Previous button
        html += `<button class="pagination-btn" onclick="PaginationControls.goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-left"></i>
        </button>`;

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (
                i === 1 ||
                i === totalPages ||
                (i >= currentPage - 2 && i <= currentPage + 2)
            ) {
                html += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" 
                    onclick="PaginationControls.goToPage(${i})">${i}</button>`;
            } else if (
                i === currentPage - 3 ||
                i === currentPage + 3
            ) {
                html += `<span class="pagination-btn disabled">...</span>`;
            }
        }

        // Next button
        html += `<button class="pagination-btn" onclick="PaginationControls.goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
            <i class="fas fa-chevron-right"></i>
        </button>`;

        container.innerHTML = html;
    },

    goToPage(page) {
        if (page < 1 || page > AppState.pagination.totalPages) return;
        
        AppState.pagination.currentPage = page;
        CourseManager.renderCoursesTable();
        this.render();
        
        // Scroll to top of table
        document.querySelector('.table-container')?.scrollIntoView({ behavior: 'smooth' });
    }
};

// ========================================
// Event Handlers
// ========================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Student Course Registration System initialized');
    
    // Initialize components
    Toast.init();
    SearchFilter.init();
    PaginationControls.init();
    
    // Initialize modals
    Modal.init('courseModal');
    Modal.init('studentModal');
    Modal.init('registrationModal');
    
    // Load initial data
    await Dashboard.init();
    await CourseManager.loadCourses();
    await StudentManager.loadStudents();
    await RegistrationManager.loadRegistrations();
    
    // Mobile menu toggle
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            document.querySelector('.mobile-menu')?.classList.toggle('show');
        });
    }
    
    // Form validation rules
    FormValidator.addRule('courseCode', [
        { required: true, message: 'Course code is required' },
        { pattern: /^[A-Z]{2,4}\d{3}$/, message: 'Invalid course code format (e.g., CS101)' }
    ]);
    
    FormValidator.addRule('courseName', [
        { required: true, message: 'Course name is required' },
        { minLength: 3, message: 'Course name must be at least 3 characters' }
    ]);
    
    FormValidator.addRule('studentEmail', [
        { required: true, message: 'Email is required' },
        { custom: Utils.isValidEmail, message: 'Invalid email format' }
    ]);
    
    // Form submissions
    document.getElementById('courseForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (FormValidator.validateForm('courseForm')) {
            const formData = new FormData(e.target);
            const courseData = Object.fromEntries(formData.entries());
            await CourseManager.addCourse(courseData);
        }
    });
    
    document.getElementById('studentForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (FormValidator.validateForm('studentForm')) {
            const formData = new FormData(e.target);
            const studentData = Object.fromEntries(formData.entries());
            await StudentManager.addStudent(studentData);
        }
    });
    
    document.getElementById('registrationForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const registrationData = Object.fromEntries(formData.entries());
        await RegistrationManager.submitRegistration(registrationData);
    });
    
    // Registration summary updates
    document.querySelectorAll('#registrationForm input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', () => RegistrationManager.calculateSummary());
    });
    
    // Navigation highlighting
    const navLinks = document.querySelectorAll('.navbar-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            const targetId = link.getAttribute('href').substring(1);
            document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' });
        });
    });
    
    // Update date/time
    const updateDateTime = () => {
        const now = new Date();
        const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
        };
        const element = document.getElementById('currentDateTime');
        if (element) {
            element.textContent = now.toLocaleDateString('en-US', options);
        }
    };
    
    updateDateTime();
    setInterval(updateDateTime, 60000);
});

// ========================================
// Global Functions (for HTML onclick handlers)
// ========================================
window.toggleMobileMenu = () => {
    document.querySelector('.mobile-menu')?.classList.toggle('show');
};

window.openCourseModal = () => Modal.open('courseModal');
window.closeCourseModal = () => Modal.close('courseModal');

window.openStudentModal = () => Modal.open('studentModal');
window.closeStudentModal = () => Modal.close('studentModal');

window.openRegistrationModal = () => Modal.open('registrationModal');
window.closeRegistrationModal = () => Modal.close('registrationModal');

window.hideToast = (toast) => {
    toast?.classList.remove('show');
    setTimeout(() => toast?.remove(), 300);
};

// Export for module usage (if using modules)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        AppState,
        Utils,
        Toast,
        Modal,
        FormValidator,
        ApiService,
        Dashboard,
        CourseManager,
        StudentManager,
        RegistrationManager,
        SearchFilter,
        PaginationControls
    };
}