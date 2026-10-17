import React, { useState } from 'react';
import { ClientProfile } from '../types';
import { Building2, Plus, Trash2, Edit2, Check, X, Search } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: ClientProfile[];
  onSelectProfile: (profile: ClientProfile) => void;
  onSaveProfile: (profile: ClientProfile) => void;
  onDeleteProfile: (id: string) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  profiles,
  onSelectProfile,
  onSaveProfile,
  onDeleteProfile,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [formData, setFormData] = useState<ClientProfile>({
    id: '',
    sacado: '',
    endereco: '',
    municipio: '',
    uf: '',
    cnpj: '',
  });

  if (!isOpen) return null;

  const filteredProfiles = profiles.filter(
    (p) =>
      p.sacado.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.cnpj.includes(searchTerm) ||
      p.municipio.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStartCreate = () => {
    setFormData({
      id: `prof-${Date.now()}`,
      sacado: '',
      endereco: '',
      municipio: '',
      uf: '',
      cnpj: '',
    });
    setIsCreating(true);
    setEditingId(null);
  };

  const handleStartEdit = (p: ClientProfile) => {
    setFormData({ ...p });
    setEditingId(p.id);
    setIsCreating(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.sacado.trim()) return;

    onSaveProfile({
      ...formData,
      sacado: formData.sacado.trim().toUpperCase(),
      endereco: formData.endereco.trim().toUpperCase(),
      municipio: formData.municipio.trim().toUpperCase(),
      uf: formData.uf.trim().toUpperCase(),
      cnpj: formData.cnpj.trim(),
    });

    setIsCreating(false);
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 print:hidden">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Perfis de Clientes (Sacados)</h2>
              <p className="text-xs text-slate-500">
                Gerencie os dados cadastrais pré-configurados para preenchimento em 1 clique
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action & Search Bar */}
        <div className="p-4 border-b border-slate-200 flex flex-wrap gap-2 items-center justify-between bg-white">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nome, CNPJ ou cidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleStartCreate}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Cliente</span>
            </button>
          </div>
        </div>

        {/* Modal Body / Create or Edit Form or List */}
        <div className="flex-1 overflow-y-auto p-6">
          {isCreating || editingId ? (
            <form onSubmit={handleSave} className="space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  {isCreating ? 'Adicionar Novo Perfil' : 'Editar Perfil'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingId(null);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Cancelar
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  SACADO (Razão Social / Nome da Instituição) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.sacado}
                  onChange={(e) => setFormData({ ...formData, sacado: e.target.value })}
                  placeholder="EX: INSTITUICAO ADVENTISTA..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ENDEREÇO *</label>
                <input
                  type="text"
                  required
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  placeholder="EX: AV. JOÃO WALLIG, 596"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">MUNICÍPIO *</label>
                  <input
                    type="text"
                    required
                    value={formData.municipio}
                    onChange={(e) => setFormData({ ...formData, municipio: e.target.value })}
                    placeholder="EX: PORTO ALEGRE"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">UF (Estado) *</label>
                  <input
                    type="text"
                    required
                    value={formData.uf}
                    onChange={(e) => setFormData({ ...formData, uf: e.target.value })}
                    placeholder="EX: RIO GRANDE DO SUL ou PARANÁ"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">CNPJ *</label>
                <input
                  type="text"
                  required
                  value={formData.cnpj}
                  onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                  placeholder="00.000.000/0000-00"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingId(null);
                  }}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors"
                >
                  <Check className="w-4 h-4" />
                  <span>Salvar Perfil</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              {filteredProfiles.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <p className="text-sm">Nenhum cliente encontrado com os filtros atuais.</p>
                </div>
              ) : (
                filteredProfiles.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 rounded-xl border border-slate-200 hover:border-slate-400 bg-white transition-all group flex items-start justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900 uppercase truncate">
                          {p.sacado}
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1 uppercase">
                        {p.endereco} — {p.municipio} / {p.uf}
                      </p>
                      <p className="text-[11px] font-mono font-medium text-slate-500 mt-0.5">
                        CNPJ: {p.cnpj}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => {
                          onSelectProfile(p);
                          onClose();
                        }}
                        className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors shadow-xs"
                      >
                        Usar na Fatura
                      </button>
                      <button
                        onClick={() => handleStartEdit(p)}
                        className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {profiles.length > 1 && (
                        <button
                          onClick={() => onDeleteProfile(p.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>{profiles.length} perfis cadastrados no sistema</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-slate-700 font-medium hover:bg-slate-200 rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
