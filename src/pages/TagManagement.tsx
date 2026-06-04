import { useState } from 'react';
import { Users, User, Plus, Edit2, Trash2, X, Check } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Character, Staff } from '../types';

export function TagManagement() {
  const characters = useStore((state) => state.characters);
  const staff = useStore((state) => state.staff);
  const addCharacter = useStore((state) => state.addCharacter);
  const updateCharacter = useStore((state) => state.updateCharacter);
  const deleteCharacter = useStore((state) => state.deleteCharacter);
  const addStaff = useStore((state) => state.addStaff);
  const updateStaff = useStore((state) => state.updateStaff);
  const deleteStaff = useStore((state) => state.deleteStaff);

  const [activeTab, setActiveTab] = useState<'characters' | 'staff'>('characters');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    work: string;
    role: string;
  }>({ name: '', work: '', role: '' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newForm, setNewForm] = useState({
    name: '',
    work: '',
    role: '',
  });

  const handleAddCharacter = () => {
    if (newForm.name.trim()) {
      addCharacter({
        name: newForm.name.trim(),
        work: newForm.work.trim(),
      });
      setNewForm({ name: '', work: '', role: '' });
      setShowAddForm(false);
    }
  };

  const handleAddStaff = () => {
    if (newForm.name.trim()) {
      addStaff({
        name: newForm.name.trim(),
        role: newForm.role.trim() || '其他',
        works: newForm.work ? [newForm.work.trim()] : [],
      });
      setNewForm({ name: '', work: '', role: '' });
      setShowAddForm(false);
    }
  };

  const startEditing = (item: Character | Staff, type: 'character' | 'staff') => {
    setEditingId(item.id);
    setEditForm({
      name: item.name,
      work: type === 'character' ? (item as Character).work : '',
      role: type === 'staff' ? (item as Staff).role : '',
    });
  };

  const saveEdit = (type: 'character' | 'staff') => {
    if (!editingId) return;

    if (type === 'character') {
      updateCharacter(editingId, {
        name: editForm.name,
        work: editForm.work,
      });
    } else {
      updateStaff(editingId, {
        name: editForm.name,
        role: editForm.role || '其他',
      });
    }
    setEditingId(null);
    setEditForm({ name: '', work: '', role: '' });
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-serif text-3xl font-bold gradient-text mb-2">
          标签管理
        </h1>
        <p className="text-gray-400">
          管理角色和制作人员标签库
        </p>
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => setActiveTab('characters')}
          className={`flex items-center gap-2 px-5 py-3 rounded-lg font-medium transition-all ${
            activeTab === 'characters'
              ? 'btn-primary text-primary-900'
              : 'btn-secondary text-white'
          }`}
        >
          <Users className="w-5 h-5" />
          角色 ({characters.length})
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={`flex items-center gap-2 px-5 py-3 rounded-lg font-medium transition-all ${
            activeTab === 'staff'
              ? 'btn-primary text-primary-900'
              : 'btn-secondary text-white'
          }`}
        >
          <User className="w-5 h-5" />
          制作人员 ({staff.length})
        </button>
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-xl font-bold text-white">
            {activeTab === 'characters' ? '角色标签' : '制作人员标签'}
          </h2>
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg btn-primary text-primary-900 font-medium"
            >
              <Plus className="w-4 h-4" />
              添加{activeTab === 'characters' ? '角色' : '人员'}
            </button>
          )}
        </div>

        {showAddForm && (
          <div className="mb-6 p-4 rounded-lg bg-primary-800/50 border border-accent-500/20">
            <h3 className="text-white font-medium mb-4">
              添加新{activeTab === 'characters' ? '角色' : '制作人员'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">名称 *</label>
                <input
                  type="text"
                  value={newForm.name}
                  onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                  placeholder="输入名称"
                  className="w-full px-3 py-2 rounded-lg bg-primary-900/50 border border-accent-500/20 text-white input-focus"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  {activeTab === 'characters' ? '所属作品' : '参与作品'}
                </label>
                <input
                  type="text"
                  value={newForm.work}
                  onChange={(e) => setNewForm({ ...newForm, work: e.target.value })}
                  placeholder="输入作品名称"
                  className="w-full px-3 py-2 rounded-lg bg-primary-900/50 border border-accent-500/20 text-white input-focus"
                />
              </div>
              {activeTab === 'staff' && (
                <div>
                  <label className="block text-sm text-gray-400 mb-1">职务</label>
                  <input
                    type="text"
                    value={newForm.role}
                    onChange={(e) => setNewForm({ ...newForm, role: e.target.value })}
                    placeholder="如：导演、原画师"
                    className="w-full px-3 py-2 rounded-lg bg-primary-900/50 border border-accent-500/20 text-white input-focus"
                  />
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewForm({ name: '', work: '', role: '' });
                }}
                className="px-4 py-2 rounded-lg btn-secondary text-white"
              >
                取消
              </button>
              <button
                onClick={activeTab === 'characters' ? handleAddCharacter : handleAddStaff}
                className="px-4 py-2 rounded-lg btn-primary text-primary-900 font-medium"
              >
                确认添加
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-accent-500/20">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">名称</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">
                  {activeTab === 'characters' ? '所属作品' : '职务'}
                </th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {activeTab === 'characters'
                ? characters.map((char) => (
                    <tr
                      key={char.id}
                      className="border-b border-accent-500/10 hover:bg-primary-800/30 transition-colors"
                    >
                      {editingId === char.id ? (
                        <>
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              value={editForm.name}
                              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                              className="w-full px-2 py-1 rounded bg-primary-900/50 border border-accent-500/30 text-white input-focus"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              value={editForm.work}
                              onChange={(e) => setEditForm({ ...editForm, work: e.target.value })}
                              className="w-full px-2 py-1 rounded bg-primary-900/50 border border-accent-500/30 text-white input-focus"
                            />
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => saveEdit('character')}
                                className="p-1 rounded hover:bg-green-500/20 text-green-400"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingId(null);
                                  setEditForm({ name: '', work: '', role: '' });
                                }}
                                className="p-1 rounded hover:bg-gray-500/20 text-gray-400"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-3 px-4 text-white">{char.name}</td>
                          <td className="py-3 px-4 text-gray-400">{char.work || '-'}</td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => startEditing(char, 'character')}
                                className="p-1 rounded hover:bg-accent-500/20 text-gray-400 hover:text-accent-400"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteCharacter(char.id)}
                                className="p-1 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))
                : staff.map((s) => (
                    <tr
                      key={s.id}
                      className="border-b border-accent-500/10 hover:bg-primary-800/30 transition-colors"
                    >
                      {editingId === s.id ? (
                        <>
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              value={editForm.name}
                              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                              className="w-full px-2 py-1 rounded bg-primary-900/50 border border-accent-500/30 text-white input-focus"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              value={editForm.role}
                              onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                              className="w-full px-2 py-1 rounded bg-primary-900/50 border border-accent-500/30 text-white input-focus"
                            />
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => saveEdit('staff')}
                                className="p-1 rounded hover:bg-green-500/20 text-green-400"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingId(null);
                                  setEditForm({ name: '', work: '', role: '' });
                                }}
                                className="p-1 rounded hover:bg-gray-500/20 text-gray-400"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-3 px-4 text-white">{s.name}</td>
                          <td className="py-3 px-4 text-gray-400">{s.role || '-'}</td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => startEditing(s, 'staff')}
                                className="p-1 rounded hover:bg-accent-500/20 text-gray-400 hover:text-accent-400"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteStaff(s.id)}
                                className="p-1 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {(activeTab === 'characters' ? characters.length : staff.length) === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-800/50 flex items-center justify-center">
              {activeTab === 'characters' ? (
                <Users className="w-8 h-8 text-gray-500" />
              ) : (
                <User className="w-8 h-8 text-gray-500" />
              )}
            </div>
            <p className="text-gray-400">
              暂无{activeTab === 'characters' ? '角色' : '制作人员'}标签
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
