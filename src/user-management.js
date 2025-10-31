/**
 * ==========================================
 * USER MANAGEMENT SYSTEM - Kromi.online
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
        this.allUsers = []; // Armazenar todos os utilizadores
        this.filteredUsers = []; // Utilizadores após filtros
        this.init();
    }

    async init() {
        console.log('[USER MANAGEMENT] Inicializando sistema de gestão de utilizadores...');
        
        // Aguardar inicialização do auth system ou Supabase Client
        if (window.authSystem && window.authSystem.supabase) {
            this.supabase = window.authSystem.supabase;
            this.currentUser = window.authSystem.currentUser;
            this.userProfile = window.authSystem.userProfile;
            this.setupEventListeners();
        } else if (window.supabaseClient) {
            // Inicializar Supabase se necessário
            if (!window.supabaseClient.initialized) {
                console.log('[USER MANAGEMENT] Inicializando Supabase...');
                await window.supabaseClient.init();
            }
            
            if (window.supabaseClient.supabase) {
                this.supabase = window.supabaseClient.supabase;
                this.setupEventListeners();
            }
        } else {
            // Aguardar auth system ou supabase client estar disponível
            const checkAuth = setInterval(async () => {
                if (window.authSystem && window.authSystem.supabase) {
                    this.supabase = window.authSystem.supabase;
                    this.currentUser = window.authSystem.currentUser;
                    this.userProfile = window.authSystem.userProfile;
                    clearInterval(checkAuth);
                    this.setupEventListeners();
                } else if (window.supabaseClient && window.supabaseClient.supabase) {
                    this.supabase = window.supabaseClient.supabase;
                    clearInterval(checkAuth);
                    this.setupEventListeners();
                } else if (window.supabaseClient && !window.supabaseClient.initialized) {
                    await window.supabaseClient.init();
                    if (window.supabaseClient.supabase) {
                        this.supabase = window.supabaseClient.supabase;
                        clearInterval(checkAuth);
                        this.setupEventListeners();
                    }
                }
            }, 100);
        }
    }

    async ensureSupabase() {
        // Aguardar até Supabase estar disponível
        if (this.supabase) return;
        
        let attempts = 0;
        const maxAttempts = 50; // 5 segundos no total
        
        while (!this.supabase && attempts < maxAttempts) {
            if (window.authSystem && window.authSystem.supabase) {
                this.supabase = window.authSystem.supabase;
                this.currentUser = window.authSystem.currentUser;
                this.userProfile = window.authSystem.userProfile;
                break;
            } else if (window.supabaseClient && window.supabaseClient.supabase) {
                this.supabase = window.supabaseClient.supabase;
                break;
            } else if (window.supabaseClient && !window.supabaseClient.initialized) {
                await window.supabaseClient.init();
                if (window.supabaseClient.supabase) {
                    this.supabase = window.supabaseClient.supabase;
                    break;
                }
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!this.supabase && attempts >= maxAttempts) {
            console.error('[USER MANAGEMENT] Timeout aguardando Supabase');
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
            console.log('[USER MANAGEMENT] Carregando utilizadores via API server-side...');
            
            // Usar rota server-side que usa Service Role Key (bypass RLS)
            const response = await fetch('/api/users/list', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Erro ao carregar utilizadores');
            }

            const users = result.users || [];
            
            console.log('[USER MANAGEMENT] Utilizadores carregados via API:', users.length);
            
            // Debug: verificar valores de last_login
            if (users && users.length > 0) {
                console.log('[USER MANAGEMENT] Exemplo de dados carregados:', {
                    name: users[0].name,
                    last_login: users[0].last_login,
                    login_count: users[0].login_count
                });
            }
            
            return users;
        } catch (error) {
            console.error('[USER MANAGEMENT] Erro ao carregar utilizadores:', error);
            // Retornar array vazio em caso de erro para não quebrar a interface
            return [];
        }
    }

    async createUser(userData) {
        try {
            console.log('[USER MANAGEMENT] Criando utilizador:', userData.email);
            
            // Chamar rota server-side para criar utilizador com password automática
            const response = await fetch('/api/users/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    email: userData.email,
                    name: userData.name,
                    phone: userData.phone || null,
                    organization: userData.organization || null,
                    role: userData.role || 'user'
                })
            });
            
            const result = await response.json();
            
            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Erro ao criar utilizador');
            }
            
            console.log('[USER MANAGEMENT] Utilizador criado com sucesso');
            
            // Mostrar password temporária ao admin
            const message = `✅ Utilizador criado com sucesso!\n\n` +
                          `📧 Email: ${result.data.profile.email}\n` +
                          `🔑 Password Temporária: ${result.data.temporaryPassword}\n\n` +
                          `⚠️ IMPORTANTE: Guarde esta password e partilhe-a com o utilizador de forma segura.\n` +
                          `O utilizador será obrigado a trocar a password no primeiro login.`;
            
            alert(message);
            
            return result.data.profile;
        } catch (error) {
            console.error('[USER MANAGEMENT] Erro ao criar utilizador:', error);
            throw error;
        }
    }

    async updateUser(userId, userData) {
        try {
            console.log('[USER MANAGEMENT] Atualizando utilizador via API server-side:', userId);
            
            // Usar endpoint server-side que valida se é admin e protege alterações de role/status
            const response = await fetch('/api/users/update', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    id: userId,
                    ...userData
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Erro ao atualizar utilizador');
            }

            console.log('[USER MANAGEMENT] Utilizador atualizado com sucesso:', result.user);
            return result.user;
        } catch (error) {
            console.error('[USER MANAGEMENT] Erro ao atualizar utilizador:', error);
            throw error;
        }
    }

    async deleteUser(userId) {
        try {
            console.log('[USER MANAGEMENT] Eliminando utilizador:', userId);
            
            // Usar API server-side para eliminar (tem acesso ao auth.users)
            const response = await fetch(`/api/users/delete`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ id: userId, user_id: userId })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Erro ao eliminar utilizador');
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
            console.log('[USER MANAGEMENT] Carregando tabela de utilizadores...');
            const users = await this.getAllUsers();
            this.allUsers = users; // Armazenar todos os utilizadores
            console.log('[USER MANAGEMENT] Total de utilizadores:', this.allUsers.length);
            this.applyFilters(); // Aplicar filtros
        } catch (error) {
            this.showError('Erro ao carregar utilizadores: ' + error.message);
        }
    }
    
    // Aplicar filtros e pesquisa
    applyFilters() {
        const searchTerm = document.getElementById('searchUsers')?.value.toLowerCase() || '';
        const filterRole = document.getElementById('filterRole')?.value || '';
        const filterStatus = document.getElementById('filterStatus')?.value || '';
        
        // Filtrar utilizadores
        this.filteredUsers = this.allUsers.filter(user => {
            // Filtro de pesquisa (nome ou email)
            const matchesSearch = !searchTerm || 
                (user.name && user.name.toLowerCase().includes(searchTerm)) ||
                (user.email && user.email.toLowerCase().includes(searchTerm));
            
            // Filtro de perfil
            const matchesRole = !filterRole || user.role === filterRole;
            
            // Filtro de estado
            const matchesStatus = !filterStatus || user.status === filterStatus;
            
            return matchesSearch && matchesRole && matchesStatus;
        });
        
        // Renderizar tabela com utilizadores filtrados
        this.renderUsersTable(this.filteredUsers);
    }
    
    // Limpar filtros
    clearFilters() {
        const searchInput = document.getElementById('searchUsers');
        const filterRole = document.getElementById('filterRole');
        const filterStatus = document.getElementById('filterStatus');
        
        if (searchInput) searchInput.value = '';
        if (filterRole) filterRole.value = '';
        if (filterStatus) filterStatus.value = '';
        
        this.applyFilters();
    }

    renderUsersTable(users) {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;

        if (users.length === 0) {
            const searchTerm = document.getElementById('searchUsers')?.value || '';
            const filterRole = document.getElementById('filterRole')?.value || '';
            const filterStatus = document.getElementById('filterStatus')?.value || '';
            
            const hasFilters = searchTerm || filterRole || filterStatus;
            
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        <p>${hasFilters ? 'Nenhum utilizador encontrado com os filtros aplicados' : 'Nenhum utilizador encontrado'}</p>
                        <small>${hasFilters ? 'Tente ajustar os filtros ou clique em "Limpar"' : 'Clique em "Adicionar Utilizador" para começar'}</small>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = users.map(user => {
            // Usar user_id se id for null (utilizador sem perfil ainda)
            const identifier = user.id || user.user_id;
            
            return `
            <tr>
                <td>${user.name || 'N/A'}</td>
                <td>${user.email}</td>
                <td><span class="role-badge ${user.role}">${this.getRoleLabel(user.role)}</span></td>
                <td><span class="status-badge ${user.status}">${this.getStatusLabel(user.status)}</span></td>
                <td>${this.formatDate(user.last_login)}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn-icon edit" onclick="window.userManagement.showEditUserModal('${identifier}')" title="Editar utilizador">
                            ✏️
                        </button>
                        ${user.status === 'active' || user.status === 'pending_verification' 
                            ? `<button class="btn-icon deactivate" onclick="window.userManagement.confirmDeactivateUser('${identifier}')" title="Desativar utilizador">
                                ⏸️
                            </button>`
                            : `<button class="btn-icon activate" onclick="window.userManagement.confirmActivateUser('${identifier}')" title="Ativar utilizador">
                                ▶️
                            </button>`
                        }
                        <button class="btn-icon delete" onclick="window.userManagement.confirmDeleteUser('${identifier}')" title="Eliminar utilizador">
                            🗑️
                        </button>
                    </div>
                </td>
            </tr>
            `;
        }).join('');
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
            'pending_verification': '⏳ Aguardando Verificação',
            'active': '✅ Ativo',
            'inactive': '⏸️ Inativo',
            'suspended': '🚫 Suspenso',
            'deleted': '🗑️ Eliminado'
        };
        return labels[status] || status || '❓ Desconhecido';
    }

    formatDate(dateString) {
        if (!dateString) return 'Nunca';
        
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0 || diffDays === 1) return 'Hoje';
        if (diffDays === 2) return 'Ontem';
        if (diffDays <= 7) return `${diffDays - 1} dias atrás`;
        if (diffDays <= 30) return `${Math.floor(diffDays / 7)} semanas atrás`;
        if (diffDays <= 365) return `${Math.floor(diffDays / 30)} meses atrás`;
        
        return date.toLocaleDateString('pt-PT', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
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
            status: formData.get('status') || 'active'
        };

        try {
            this.showLoading('Criando utilizador...');
            await this.createUser(userData);
            // Não mostrar "sucesso" adicional - a mensagem com a password já foi mostrada
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
        
        // Processar redes sociais
        const socialMedia = {};
        const linkedIn = formData.get('social_linkedin');
        const twitter = formData.get('social_twitter');
        const facebook = formData.get('social_facebook');
        if (linkedIn) socialMedia.linkedin = linkedIn;
        if (twitter) socialMedia.twitter = twitter;
        if (facebook) socialMedia.facebook = facebook;
        
        const userData = {
            name: formData.get('name'),
            phone: formData.get('phone'),
            organization: formData.get('organization'),
            role: formData.get('role'),
            status: formData.get('status'),
            
            // Informação pessoal
            birth_date: formData.get('birth_date') || null,
            gender: formData.get('gender') || null,
            nationality: formData.get('nationality') || null,
            tax_id: formData.get('tax_id') || null,
            biography: formData.get('biography') || null,
            
            // Contactos adicionais
            phone_alt: formData.get('phone_alt') || null,
            email_alt: formData.get('email_alt') || null,
            website: formData.get('website') || null,
            social_media: Object.keys(socialMedia).length > 0 ? socialMedia : null,
            
            // Morada
            address_line1: formData.get('address_line1') || null,
            address_line2: formData.get('address_line2') || null,
            city: formData.get('city') || null,
            state_province: formData.get('state_province') || null,
            postal_code: formData.get('postal_code') || null,
            country: formData.get('country') || null,
            
            // Profissional
            job_title: formData.get('job_title') || null,
            department: formData.get('department') || null,
            hire_date: formData.get('hire_date') || null,
            
            // Equipa/Clube
            team_club_name: formData.get('team_club_name') || null,
            team_club_category: formData.get('team_club_category') || null,
            team_position: formData.get('team_position') || null,
            team_athlete_number: formData.get('team_athlete_number') || null,
            team_join_date: formData.get('team_join_date') || null,
            team_notes: formData.get('team_notes') || null,
            
            // Dimensões de Roupa
            clothing_tshirt: formData.get('clothing_tshirt') || null,
            clothing_casaco: formData.get('clothing_casaco') || null,
            clothing_calcoes: formData.get('clothing_calcoes') || null,
            clothing_jersey: formData.get('clothing_jersey') || null,
            clothing_calcas: formData.get('clothing_calcas') || null,
            clothing_sapatos: formData.get('clothing_sapatos') || null,
            
            // Emergência
            emergency_contact_name: formData.get('emergency_contact_name') || null,
            emergency_contact_phone: formData.get('emergency_contact_phone') || null,
            emergency_contact_relation: formData.get('emergency_contact_relation') || null,
            
            // Sistema
            timezone: formData.get('timezone') || null,
            language: formData.get('language') || null
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
            
            // Se userId é null ou 'null', buscar pelos dados do allUsers
            if (!userId || userId === 'null') {
                console.error('[USER MANAGEMENT] ID inválido para editar');
                this.showError('Erro: ID de utilizador inválido');
                return;
            }
            
            // Sempre usar API server-side que tem acesso completo ao auth.users
            // Isso garante que funciona mesmo quando não há perfil ainda
            let user = null;
            
            try {
                // Passar ambos os parâmetros - o endpoint vai tentar ambos os métodos
                // Isso garante que funciona tanto para id de perfil quanto para user_id
                const url = `/api/users/get?id=${userId}&user_id=${userId}`;
                
                const response = await fetch(url, {
                    credentials: 'include'
                });
                
                if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.user) {
                        user = result.user;
                    } else {
                        throw new Error('Utilizador não encontrado');
                    }
                } else {
                    const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
                    throw new Error(errorData.error || 'Erro ao buscar utilizador');
                }
            } catch (fetchError) {
                console.error('[USER MANAGEMENT] Erro ao buscar via API:', fetchError);
                this.showError('Erro ao carregar dados do utilizador: ' + fetchError.message);
                return;
            }
            
            if (!user) {
                console.error('[USER MANAGEMENT] Utilizador não encontrado após busca');
                this.showError('Utilizador não encontrado');
                return;
            }
            
            console.log('[USER MANAGEMENT] Dados carregados:', user);
            
            // Preencher formulário - Informação Básica
            document.getElementById('editUserId').value = user.id;
            document.getElementById('editUserUserId').value = user.user_id;
            document.getElementById('editUserName').value = user.name || '';
            document.getElementById('editUserEmail').value = user.email || '';
            document.getElementById('editUserPhone').value = user.phone || '';
            document.getElementById('editUserOrganization').value = user.organization || '';
            document.getElementById('editUserRole').value = user.role || 'user';
            document.getElementById('editUserStatus').value = user.status || 'active';
            
            // Informação Pessoal
            document.getElementById('editUserBirthDate').value = user.birth_date || '';
            document.getElementById('editUserGender').value = user.gender || '';
            document.getElementById('editUserNationality').value = user.nationality || '';
            document.getElementById('editUserTaxId').value = user.tax_id || '';
            document.getElementById('editUserBiography').value = user.biography || '';
            
            // Contactos
            document.getElementById('editUserPhoneAlt').value = user.phone_alt || '';
            document.getElementById('editUserEmailAlt').value = user.email_alt || '';
            document.getElementById('editUserWebsite').value = user.website || '';
            
            // Redes Sociais
            if (user.social_media && typeof user.social_media === 'object') {
                document.getElementById('editUserLinkedIn').value = user.social_media.linkedin || '';
                document.getElementById('editUserTwitter').value = user.social_media.twitter || '';
                document.getElementById('editUserFacebook').value = user.social_media.facebook || '';
            }
            
            // Morada
            document.getElementById('editUserAddressLine1').value = user.address_line1 || '';
            document.getElementById('editUserAddressLine2').value = user.address_line2 || '';
            document.getElementById('editUserCity').value = user.city || '';
            document.getElementById('editUserStateProvince').value = user.state_province || '';
            document.getElementById('editUserPostalCode').value = user.postal_code || '';
            document.getElementById('editUserCountry').value = user.country || '';
            
            // Profissional
            document.getElementById('editUserJobTitle').value = user.job_title || '';
            document.getElementById('editUserDepartment').value = user.department || '';
            document.getElementById('editUserHireDate').value = user.hire_date || '';
            
            // Equipa/Clube
            document.getElementById('editUserTeamClubName').value = user.team_club_name || '';
            document.getElementById('editUserTeamClubCategory').value = user.team_club_category || '';
            document.getElementById('editUserTeamPosition').value = user.team_position || '';
            document.getElementById('editUserTeamAthleteNumber').value = user.team_athlete_number || '';
            document.getElementById('editUserTeamJoinDate').value = user.team_join_date || '';
            document.getElementById('editUserTeamNotes').value = user.team_notes || '';
            
            // Dimensões de Roupa
            const clothingSizes = user.clothing_sizes || {};
            document.getElementById('editUserClothingTshirt').value = clothingSizes.tshirt || '';
            document.getElementById('editUserClothingCasaco').value = clothingSizes.casaco || '';
            document.getElementById('editUserClothingCalcoes').value = clothingSizes.calcoes || '';
            document.getElementById('editUserClothingJersey').value = clothingSizes.jersey || '';
            document.getElementById('editUserClothingCalcas').value = clothingSizes.calcas || '';
            document.getElementById('editUserClothingSapatos').value = clothingSizes.sapatos || '';
            
            // Emergência
            document.getElementById('editUserEmergencyName').value = user.emergency_contact_name || '';
            document.getElementById('editUserEmergencyPhone').value = user.emergency_contact_phone || '';
            document.getElementById('editUserEmergencyRelation').value = user.emergency_contact_relation || '';
            
            // Sistema
            document.getElementById('editUserTimezone').value = user.timezone || 'Europe/Lisbon';
            document.getElementById('editUserLanguage').value = user.language || 'pt';
            
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
        if (confirm('⚠️ ATENÇÃO: Esta ação irá eliminar PERMANENTEMENTE todos os registros associados a este utilizador em toda a plataforma.\n\nEsta ação NÃO pode ser desfeita.\n\nTem certeza que deseja continuar?')) {
            this.handleDeleteUser(userId);
        }
    }
    
    async handleDeleteUser(userId) {
        try {
            this.showLoading('Eliminando utilizador e todos os registros associados...');
            await this.deleteUser(userId);
            this.showSuccess('Utilizador eliminado completamente!');
            await this.loadUsersTable();
        } catch (error) {
            this.showError('Erro ao eliminar utilizador: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    confirmActivateUser(userId) {
        if (confirm('Deseja ativar este utilizador? O utilizador poderá fazer login e aceder à plataforma.')) {
            this.handleActivateUser(userId);
        }
    }

    async handleActivateUser(userId) {
        try {
            this.showLoading('Ativando utilizador...');
            
            // userId já é uma string (o identificador passado no onclick)
            const identifier = userId;
            
            const response = await fetch('/api/users/activate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    id: identifier,
                    user_id: identifier
                })
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || 'Erro ao ativar utilizador');
            }

            this.showSuccess('Utilizador ativado com sucesso!');
            await this.loadUsersTable();
        } catch (error) {
            this.showError('Erro ao ativar utilizador: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    confirmDeactivateUser(userId) {
        if (confirm('Deseja desativar este utilizador? O utilizador NÃO poderá fazer login nem aceder à plataforma.\n\nTodas as sessões ativas serão encerradas.')) {
            this.handleDeactivateUser(userId);
        }
    }

    async handleDeactivateUser(userId) {
        try {
            this.showLoading('Desativando utilizador...');
            
            // userId já é uma string (o identificador passado no onclick)
            const identifier = userId;
            
            const response = await fetch('/api/users/deactivate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    id: identifier,
                    user_id: identifier
                })
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || 'Erro ao desativar utilizador');
            }

            this.showSuccess('Utilizador desativado com sucesso! Todas as sessões foram encerradas.');
            await this.loadUsersTable();
        } catch (error) {
            this.showError('Erro ao desativar utilizador: ' + error.message);
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
