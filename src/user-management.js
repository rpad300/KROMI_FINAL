/**
 * ==========================================
 * USER MANAGEMENT SYSTEM - VisionKrono
 * ==========================================
 * 
 * Sistema completo de gestão de utilizadores
 * Inclui: CRUD de utilizadores, perfis, permissões
 * 
 * Versão: 1.0
 * Data: 2025-10-25
 * ==========================================
 */

class UserManagement {
    constructor() {
        this.supabase = null;
        this.currentUser = null;
        this.userProfile = null;
        this.init();
    }

    async init() {
        console.log('[USER MANAGEMENT] Inicializando sistema de gestão de utilizadores...');
        
        // Aguardar inicialização do auth system
        if (window.authSystem && window.authSystem.supabase) {
            this.supabase = window.authSystem.supabase;
            this.currentUser = window.authSystem.currentUser;
            this.userProfile = window.authSystem.userProfile;
            this.setupEventListeners();
        } else {
            // Aguardar auth system estar disponível
            const checkAuth = setInterval(() => {
                if (window.authSystem && window.authSystem.supabase) {
                    this.supabase = window.authSystem.supabase;
                    this.currentUser = window.authSystem.currentUser;
                    this.userProfile = window.authSystem.userProfile;
                    clearInterval(checkAuth);
                    this.setupEventListeners();
                }
            }, 100);
        }
    }

    setupEventListeners() {
        // Event listeners para formulários
        const addUserForm = document.getElementById('addUserForm');
        if (addUserForm) {
            addUserForm.addEventListener('submit', (e) => this.handleAddUser(e));
        }
        
        const editUserForm = document.getElementById('editUserForm');
        if (editUserForm) {
            editUserForm.addEventListener('submit', (e) => this.handleEditUser(e));
        }

        const profileEditForm = document.getElementById('profileEditForm');
        if (profileEditForm) {
            profileEditForm.addEventListener('submit', (e) => this.handleProfileEdit(e));
        }

        console.log('[USER MANAGEMENT] Event listeners configurados');
    }

    // ==========================================
    // USER CRUD OPERATIONS
    // ==========================================

    async getAllUsers() {
        try {
            console.log('[USER MANAGEMENT] Carregando utilizadores...');
            
            const { data: users, error } = await this.supabase
                .from('user_profiles')
                .select(`
                    id,
                    user_id,
                    name,
                    email,
                    phone,
                    organization,
                    role,
                    status,
                    created_at,
                    updated_at,
                    last_login,
                    login_count
                `)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('[USER MANAGEMENT] Erro ao carregar utilizadores:', error);
                throw error;
            }

            console.log('[USER MANAGEMENT] Utilizadores carregados:', users?.length || 0);
            return users || [];
        } catch (error) {
            console.error('[USER MANAGEMENT] Erro ao carregar utilizadores:', error);
            // Retornar array vazio em caso de erro para não quebrar a interface
            return [];
        }
    }

    async createUser(userData) {
        try {
            console.log('[USER MANAGEMENT] Criando utilizador:', userData.email);
            
            // Criar utilizador no Supabase Auth
            const { data: authData, error: authError } = await this.supabase.auth.admin.createUser({
                email: userData.email,
                password: userData.password,
                email_confirm: true
            });

            if (authError) {
                console.error('[USER MANAGEMENT] Erro ao criar utilizador no auth:', authError);
                throw authError;
            }

            // Criar perfil do utilizador
            const { data: profileData, error: profileError } = await this.supabase
                .from('user_profiles')
                .insert({
                    user_id: authData.user.id,
                    name: userData.name,
                    email: userData.email,
                    phone: userData.phone || null,
                    organization: userData.organization || null,
                    role: userData.role || 'user',
                    status: 'active',
                    created_by: this.currentUser.id
                })
                .select()
                .single();

            if (profileError) {
                console.error('[USER MANAGEMENT] Erro ao criar perfil:', profileError);
                throw profileError;
            }

            console.log('[USER MANAGEMENT] Utilizador criado com sucesso:', profileData);
            return profileData;
        } catch (error) {
            console.error('[USER MANAGEMENT] Erro ao criar utilizador:', error);
            throw error;
        }
    }

    async updateUser(userId, userData) {
        try {
            console.log('[USER MANAGEMENT] Atualizando utilizador:', userId);
            
            // Atualizar perfil
            const updateData = {
                name: userData.name,
                phone: userData.phone,
                organization: userData.organization,
                role: userData.role,
                status: userData.status,
                updated_at: new Date().toISOString()
            };
            
            const { data, error } = await this.supabase
                .from('user_profiles')
                .update(updateData)
                .eq('id', userId)
                .select()
                .single();

            if (error) {
                console.error('[USER MANAGEMENT] Erro ao atualizar perfil:', error);
                throw error;
            }
            
            // Se password foi fornecida, atualizar no Supabase Auth
            if (userData.password && data.user_id) {
                console.log('[USER MANAGEMENT] Atualizando password do utilizador...');
                const { error: authError } = await this.supabase.auth.admin.updateUserById(
                    data.user_id,
                    { password: userData.password }
                );
                
                if (authError) {
                    console.error('[USER MANAGEMENT] Erro ao atualizar password:', authError);
                    // Não lançar erro - perfil foi atualizado com sucesso
                    console.warn('[USER MANAGEMENT] Perfil atualizado mas password falhou');
                } else {
                    console.log('[USER MANAGEMENT] Password atualizada com sucesso');
                }
            }

            console.log('[USER MANAGEMENT] Utilizador atualizado com sucesso:', data);
            return data;
        } catch (error) {
            console.error('[USER MANAGEMENT] Erro ao atualizar utilizador:', error);
            throw error;
        }
    }

    async deleteUser(userId) {
        try {
            console.log('[USER MANAGEMENT] Eliminando utilizador:', userId);
            
            // Primeiro obter o user_id
            const { data: profile, error: profileError } = await this.supabase
                .from('user_profiles')
                .select('user_id')
                .eq('id', userId)
                .single();

            if (profileError) {
                console.error('[USER MANAGEMENT] Erro ao obter perfil:', profileError);
                throw profileError;
            }

            // Eliminar utilizador do Supabase Auth
            const { error: authError } = await this.supabase.auth.admin.deleteUser(profile.user_id);
            
            if (authError) {
                console.error('[USER MANAGEMENT] Erro ao eliminar utilizador do auth:', authError);
                throw authError;
            }

            // Eliminar perfil
            const { error: deleteError } = await this.supabase
                .from('user_profiles')
                .delete()
                .eq('id', userId);

            if (deleteError) {
                console.error('[USER MANAGEMENT] Erro ao eliminar perfil:', deleteError);
                throw deleteError;
            }

            console.log('[USER MANAGEMENT] Utilizador eliminado com sucesso');
            return true;
        } catch (error) {
            console.error('[USER MANAGEMENT] Erro ao eliminar utilizador:', error);
            throw error;
        }
    }

    async updateUserStatus(userId, status) {
        try {
            console.log('[USER MANAGEMENT] Atualizando estado do utilizador:', userId, status);
            
            const { data, error } = await this.supabase
                .from('user_profiles')
                .update({
                    status: status,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId)
                .select()
                .single();

            if (error) {
                console.error('[USER MANAGEMENT] Erro ao atualizar estado:', error);
                throw error;
            }

            console.log('[USER MANAGEMENT] Estado atualizado com sucesso:', data);
            return data;
        } catch (error) {
            console.error('[USER MANAGEMENT] Erro ao atualizar estado:', error);
            throw error;
        }
    }

    // ==========================================
    // PROFILE MANAGEMENT
    // ==========================================

    async updateProfile(profileData) {
        try {
            console.log('[USER MANAGEMENT] Atualizando perfil do utilizador atual...');
            
            const { data, error } = await this.supabase
                .from('user_profiles')
                .update({
                    name: profileData.name,
                    phone: profileData.phone,
                    organization: profileData.organization,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', this.currentUser.id)
                .select()
                .single();

            if (error) {
                console.error('[USER MANAGEMENT] Erro ao atualizar perfil:', error);
                throw error;
            }

            // Atualizar perfil local
            if (window.authSystem) {
                window.authSystem.userProfile = data;
            }

            console.log('[USER MANAGEMENT] Perfil atualizado com sucesso:', data);
            return data;
        } catch (error) {
            console.error('[USER MANAGEMENT] Erro ao atualizar perfil:', error);
            throw error;
        }
    }

    async changePassword(currentPassword, newPassword) {
        try {
            console.log('[USER MANAGEMENT] Alterando palavra-passe...');
            
            const { error } = await this.supabase.auth.updateUser({
                password: newPassword
            });

            if (error) {
                console.error('[USER MANAGEMENT] Erro ao alterar palavra-passe:', error);
                throw error;
            }

            console.log('[USER MANAGEMENT] Palavra-passe alterada com sucesso');
            return true;
        } catch (error) {
            console.error('[USER MANAGEMENT] Erro ao alterar palavra-passe:', error);
            throw error;
        }
    }

    // ==========================================
    // ROLE AND PERMISSIONS
    // ==========================================

    async updateUserRole(userId, newRole) {
        try {
            console.log('[USER MANAGEMENT] Atualizando role do utilizador:', userId, newRole);
            
            const { data, error } = await this.supabase
                .from('user_profiles')
                .update({
                    role: newRole,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId)
                .select()
                .single();

            if (error) {
                console.error('[USER MANAGEMENT] Erro ao atualizar role:', error);
                throw error;
            }

            console.log('[USER MANAGEMENT] Role atualizado com sucesso:', data);
            return data;
        } catch (error) {
            console.error('[USER MANAGEMENT] Erro ao atualizar role:', error);
            throw error;
        }
    }

    hasPermission(permission) {
        if (!this.userProfile) return false;
        
        const rolePermissions = {
            'admin': ['*'], // Admin tem todas as permissões
            'moderator': ['read_users', 'update_users', 'read_events', 'update_events'],
            'user': ['read_own_profile', 'update_own_profile']
        };

        const userPermissions = rolePermissions[this.userProfile.role] || [];
        return userPermissions.includes('*') || userPermissions.includes(permission);
    }

    // ==========================================
    // UI HELPERS
    // ==========================================

    async loadUsersTable() {
        try {
            const users = await this.getAllUsers();
            this.renderUsersTable(users);
        } catch (error) {
            this.showError('Erro ao carregar utilizadores: ' + error.message);
        }
    }

    renderUsersTable(users) {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;

        if (users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        <p>Nenhum utilizador encontrado</p>
                        <small>Clique em "Adicionar Utilizador" para começar</small>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = users.map(user => `
            <tr>
                <td>${user.name || 'N/A'}</td>
                <td>${user.email}</td>
                <td><span class="role-badge ${user.role}">${this.getRoleLabel(user.role)}</span></td>
                <td><span class="status-badge ${user.status}">${this.getStatusLabel(user.status)}</span></td>
                <td>${this.formatDate(user.last_login)}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn-icon edit" onclick="window.userManagement.showEditUserModal('${user.id}')" title="Editar utilizador">
                            ✏️
                        </button>
                        <button class="btn-icon delete" onclick="window.userManagement.confirmDeleteUser('${user.id}')" title="Eliminar utilizador">
                            🗑️
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    getRoleBadgeClass(role) {
        const classes = {
            'admin': 'primary',
            'moderator': 'info',
            'user': 'success'
        };
        return classes[role] || 'secondary';
    }

    getRoleLabel(role) {
        const labels = {
            'admin': '👑 Administrador',
            'moderator': '⚙️ Moderador',
            'user': '👤 Utilizador'
        };
        return labels[role] || role;
    }
    
    getStatusLabel(status) {
        const labels = {
            'active': '✅ Ativo',
            'inactive': '⏸️ Inativo',
            'suspended': '🚫 Suspenso'
        };
        return labels[status] || status;
    }

    formatDate(dateString) {
        if (!dateString) return 'Nunca';
        
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) return 'Hoje';
        if (diffDays === 2) return 'Ontem';
        if (diffDays <= 7) return `${diffDays - 1} dias atrás`;
        
        return date.toLocaleDateString('pt-PT');
    }

    // ==========================================
    // FORM HANDLERS
    // ==========================================

    async handleAddUser(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const userData = {
            name: formData.get('name'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            organization: formData.get('organization'),
            role: formData.get('role'),
            status: formData.get('status') || 'active',
            password: formData.get('password')
        };

        try {
            this.showLoading('Criando utilizador...');
            await this.createUser(userData);
            this.showSuccess('Utilizador criado com sucesso!');
            this.hideAddUserModal();
            await this.loadUsersTable();
        } catch (error) {
            this.showError('Erro ao criar utilizador: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }
    
    async handleEditUser(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const userId = formData.get('id');
        const userData = {
            name: formData.get('name'),
            phone: formData.get('phone'),
            organization: formData.get('organization'),
            role: formData.get('role'),
            status: formData.get('status')
        };
        
        // Se checkbox de alterar password estiver marcada, incluir nova password
        const changePassword = document.getElementById('changePassword');
        if (changePassword && changePassword.checked) {
            const newPassword = formData.get('newPassword');
            if (newPassword) {
                userData.password = newPassword;
            }
        }

        try {
            this.showLoading('Atualizando utilizador...');
            await this.updateUser(userId, userData);
            this.showSuccess('Utilizador atualizado com sucesso!');
            this.hideEditUserModal();
            await this.loadUsersTable();
        } catch (error) {
            this.showError('Erro ao atualizar utilizador: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    async handleProfileEdit(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const profileData = {
            name: formData.get('name'),
            phone: formData.get('phone'),
            organization: formData.get('organization')
        };

        try {
            this.showLoading('Atualizando perfil...');
            await this.updateProfile(profileData);
            this.showSuccess('Perfil atualizado com sucesso!');
            this.hideProfileEditPanel();
            this.loadUserData();
        } catch (error) {
            this.showError('Erro ao atualizar perfil: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    // ==========================================
    // UI MODAL FUNCTIONS
    // ==========================================

    showAddUserModal() {
        const modal = document.getElementById('addUserModal');
        if (modal) modal.style.display = 'flex';
    }

    hideAddUserModal() {
        const modal = document.getElementById('addUserModal');
        if (modal) {
            modal.style.display = 'none';
            document.getElementById('addUserForm').reset();
        }
    }
    
    async showEditUserModal(userId) {
        try {
            console.log('[USER MANAGEMENT] Carregando dados do utilizador:', userId);
            
            const modal = document.getElementById('editUserModal');
            if (!modal) {
                console.error('[USER MANAGEMENT] Modal de editar não encontrado');
                return;
            }
            
            // Carregar dados do utilizador
            const { data: user, error } = await this.supabase
                .from('user_profiles')
                .select('*')
                .eq('id', userId)
                .single();
            
            if (error) {
                console.error('[USER MANAGEMENT] Erro ao carregar utilizador:', error);
                this.showError('Erro ao carregar dados do utilizador');
                return;
            }
            
            console.log('[USER MANAGEMENT] Dados carregados:', user);
            
            // Preencher formulário
            document.getElementById('editUserId').value = user.id;
            document.getElementById('editUserUserId').value = user.user_id;
            document.getElementById('editUserName').value = user.name || '';
            document.getElementById('editUserEmail').value = user.email || '';
            document.getElementById('editUserPhone').value = user.phone || '';
            document.getElementById('editUserOrganization').value = user.organization || '';
            document.getElementById('editUserRole').value = user.role || 'user';
            document.getElementById('editUserStatus').value = user.status || 'active';
            
            // Resetar campos de password
            const changePasswordCheckbox = document.getElementById('changePassword');
            const passwordFields = document.getElementById('passwordFields');
            if (changePasswordCheckbox) changePasswordCheckbox.checked = false;
            if (passwordFields) passwordFields.style.display = 'none';
            document.getElementById('editUserNewPassword').value = '';
            
            // Mostrar modal
            modal.classList.add('active');
            modal.style.display = 'flex';
            
        } catch (error) {
            console.error('[USER MANAGEMENT] Erro ao abrir modal de editar:', error);
            this.showError('Erro ao carregar utilizador');
        }
    }
    
    hideEditUserModal() {
        const modal = document.getElementById('editUserModal');
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
            document.getElementById('editUserForm').reset();
        }
    }

    showEditProfileModal() {
        const panel = document.getElementById('profileEditPanel');
        if (panel) {
            panel.style.display = 'block';
            this.loadProfileData();
        }
    }

    hideProfileEditPanel() {
        const panel = document.getElementById('profileEditPanel');
        if (panel) panel.style.display = 'none';
    }

    loadProfileData() {
        if (!this.userProfile) return;

        const nameInput = document.getElementById('editName');
        const phoneInput = document.getElementById('editPhone');
        const organizationInput = document.getElementById('editOrganization');

        if (nameInput) nameInput.value = this.userProfile.name || '';
        if (phoneInput) phoneInput.value = this.userProfile.phone || '';
        if (organizationInput) organizationInput.value = this.userProfile.organization || '';
    }

    // ==========================================
    // UTILITY FUNCTIONS
    // ==========================================

    showLoading(message = 'A processar...') {
        // Implementar loading indicator
        console.log('[USER MANAGEMENT] Loading:', message);
    }

    hideLoading() {
        // Implementar hide loading indicator
        console.log('[USER MANAGEMENT] Loading hidden');
    }

    showSuccess(message) {
        alert('✅ ' + message);
    }

    showError(message) {
        alert('❌ ' + message);
    }

    loadUserData() {
        if (window.loadUserData) {
            window.loadUserData();
        }
    }

    // ==========================================
    // PUBLIC API METHODS
    // ==========================================

    async editUser(userId) {
        // Implementar modal de edição
        alert('Editar utilizador: ' + userId);
    }

    async toggleUserStatus(userId, currentStatus) {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        
        if (confirm(`Tem certeza que deseja ${newStatus === 'active' ? 'ativar' : 'desativar'} este utilizador?`)) {
            try {
                this.showLoading('Atualizando estado...');
                await this.updateUserStatus(userId, newStatus);
                this.showSuccess(`Utilizador ${newStatus === 'active' ? 'ativado' : 'desativado'} com sucesso!`);
                await this.loadUsersTable();
            } catch (error) {
                this.showError('Erro ao atualizar estado: ' + error.message);
            } finally {
                this.hideLoading();
            }
        }
    }

    confirmDeleteUser(userId) {
        if (confirm('Tem certeza que deseja eliminar este utilizador? Esta ação não pode ser desfeita.')) {
            this.handleDeleteUser(userId);
        }
    }
    
    async handleDeleteUser(userId) {
        try {
            this.showLoading('Eliminando utilizador...');
            await this.deleteUser(userId);
            this.showSuccess('Utilizador eliminado com sucesso!');
            await this.loadUsersTable();
        } catch (error) {
            this.showError('Erro ao eliminar utilizador: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    window.userManagement = new UserManagement();
});

// Exportar para uso global
window.UserManagement = UserManagement;
