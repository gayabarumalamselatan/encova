"use client";

import React, { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Account, AvailableModule, Role } from "@/lib/types/auth";
import { Trash, Edit, Plus, Save, X, Search } from "lucide-react";
import router from "next/router";

export default function AccountManagement() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [modules, setModules] = useState<AvailableModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Account>>({});
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/accounts");
      const data = await res.json();
      setAccounts(data.accounts || []);
      setModules(data.availableModules || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredAccounts = accounts.filter((a) =>
    a.username.toLowerCase().includes(search.toLowerCase()),
  );

  const handleEdit = (acc: Account) => {
    setEditingId(acc.id.toString());
    setIsNew(false);
    setForm({ ...acc, password: "" }); // Password hidden, blank to signify no change
  };

  const handleNew = () => {
    setEditingId("new");
    setIsNew(true);
    setForm({
      username: "",
      password: "",
      role: "user",
      enabled: true,
      modules: [],
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsNew(false);
    setForm({});
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isNew) {
        await fetch("/api/accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      } else {
        const payload: any = { ...form };
        if (!payload.password) delete payload.password; // Don't send empty password
        await fetch("/api/accounts", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      handleCancel();
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Failed to save account");
    }
  };

  const handleDelete = async (id: string | number) => {
    if (!confirm("Are you sure you want to delete this account?")) return;
    try {
      await fetch(`/api/accounts?id=${id}`, { method: "DELETE" });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleModule = (moduleId: string) => {
    const currentModules = form.modules || [];
    if (moduleId === "all") {
      setForm({
        ...form,
        modules: currentModules.includes("all") ? [] : ["all"],
      });
      return;
    }

    if (currentModules.includes("all")) {
      setForm({ ...form, modules: [moduleId] }); // Unset all, set this one
      return;
    }

    if (currentModules.includes(moduleId)) {
      setForm({
        ...form,
        modules: currentModules.filter((m) => m !== moduleId),
      });
    } else {
      setForm({ ...form, modules: [...currentModules, moduleId] });
    }
  };

  return (
    <ProtectedRoute requiredRole="admin">
      <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center">
        <div className="max-w-6xl w-full space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Account Management
            </h1>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={handleNew}
                className="hover:cursor-pointer"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Account
              </Button>
              <Button
                onClick={() => window.history.back()}
                className="bg-black hover:cursor-pointer"
              >
                <Plus className="w-4 h-4 mr-2" />
                Back to Homepage
              </Button>
            </div>
          </div>

          {editingId && (
            <Card className="border-blue-200 shadow-md">
              <CardHeader>
                <CardTitle>
                  {isNew ? "Create Account" : "Edit Account"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSave} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Username</Label>
                      <Input
                        value={form.username || ""}
                        onChange={(e) =>
                          setForm({ ...form, username: e.target.value })
                        }
                        required
                        disabled={!isNew}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>
                        Password{" "}
                        {isNew ? "" : "(Leave blank to keep unchanged)"}
                      </Label>
                      <Input
                        type="password"
                        value={form.password || ""}
                        onChange={(e) =>
                          setForm({ ...form, password: e.target.value })
                        }
                        required={isNew}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        value={form.role || "user"}
                        onChange={(e) =>
                          setForm({ ...form, role: e.target.value as Role })
                        }
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        value={form.enabled ? "enabled" : "disabled"}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            enabled: e.target.value === "enabled",
                          })
                        }
                      >
                        <option value="enabled">Enabled</option>
                        <option value="disabled">Disabled</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2 pt-4 border-t">
                    <Label>Allowed Modules</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <label className="flex items-center space-x-2 bg-gray-50 p-2 rounded border">
                        <input
                          type="checkbox"
                          checked={form.modules?.includes("all")}
                          onChange={() => toggleModule("all")}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium">
                          All Modules (Admin default)
                        </span>
                      </label>
                      {modules.map((mod) => (
                        <label
                          key={mod.id}
                          className="flex items-center space-x-2 bg-gray-50 p-2 rounded border"
                        >
                          <input
                            type="checkbox"
                            checked={
                              form.modules?.includes("all") ||
                              form.modules?.includes(mod.id)
                            }
                            onChange={() => toggleModule(mod.id)}
                            disabled={form.modules?.includes("all")}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm">{mod.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      className="hover:cursor-pointer"
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                    >
                      <X className="w-4 h-4 mr-2" /> Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="bg-green-600 hover:bg-green-700 text-white hover:cursor-pointer"
                    >
                      <Save className="w-4 h-4 mr-2" /> Save Account
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <Card className="shadow-md">
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle>Accounts List</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search accounts..."
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">Loading accounts...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3">Username</th>
                        <th className="px-4 py-3">Role</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Modules</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAccounts.map((acc) => (
                        <tr
                          key={acc.id}
                          className="bg-white border-b hover:bg-gray-50"
                        >
                          <td className="px-4 py-3 font-medium">
                            {acc.username}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${acc.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}
                            >
                              {acc.role.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${acc.enabled ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                            >
                              {acc.enabled ? "ACTIVE" : "DISABLED"}
                            </span>
                          </td>
                          <td className="px-4 py-3 max-w-[200px] truncate">
                            {acc.modules.includes("all")
                              ? "All"
                              : acc.modules.length}{" "}
                            modules
                          </td>
                          <td className="px-4 py-3 flex justify-end space-x-2">
                            <Button
                              className="hover:cursor-pointer"
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(acc)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              className="hover:cursor-pointer"
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(acc.id)}
                            >
                              <Trash className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {filteredAccounts.length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="text-center py-4 text-gray-500"
                          >
                            No accounts found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
