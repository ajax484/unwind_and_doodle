"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  Role,
  TeamMember,
  TeamInvitation,
  ADMIN_ROLES,
} from "@/types/admin-team";
import { toast } from "sonner";

const ROLE_DESCRIPTIONS: Record<
  Role,
  { title: string; desc: string; icon: string; badgeClass: string }
> = {
  owner: {
    title: "Owner",
    desc: "Full platform access including organization settings, billing, and team ownership management.",
    icon: "👑",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
  },
  admin: {
    title: "Admin",
    desc: "Operational management of products, orders, customers, inventory, discounts, and team members.",
    icon: "🛡️",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
  },
  staff: {
    title: "Staff",
    desc: "Operational handling of products, orders, customers, and inventory. No team or settings access.",
    icon: "👤",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
  },
};

export default function TeamManagementPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"members" | "invitations">(
    "members",
  );
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("staff");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Edit Role Modal
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role>("staff");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete Member Confirmation Modal
  const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Cancel Invite Confirmation Modal
  const [inviteToCancel, setInviteToCancel] = useState<TeamInvitation | null>(
    null,
  );
  const [cancelLoading, setCancelLoading] = useState(false);

  // Resend Loading state
  const [resendingId, setResendingId] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const fetchTeamData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/team");
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load team data");
      }

      setMembers(json.data.members || []);
      setInvitations(json.data.invitations || []);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred loading team data",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamData();
  }, []);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      setInviteError("Please enter a valid email address");
      return;
    }

    try {
      setInviteLoading(true);
      setInviteError(null);

      const res = await fetch("/api/admin/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to send invitation");
      }

      toast.success(`Invitation sent to ${inviteEmail}`);
      setIsInviteModalOpen(false);
      setInviteEmail("");
      setInviteRole("staff");
      fetchTeamData();
    } catch (err: unknown) {
      setInviteError(
        err instanceof Error ? err.message : "Failed to send invitation",
      );
    } finally {
      setInviteLoading(false);
    }
  };

  const handleResendInvite = async (invitationId: string) => {
    try {
      setResendingId(invitationId);
      const res = await fetch(
        `/api/admin/team/invitations/${invitationId}/resend`,
        {
          method: "POST",
        },
      );
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to resend invitation");
      }

      toast.success("Invitation successfully resent!");
      fetchTeamData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to resend invitation");
    } finally {
      setResendingId(null);
    }
  };

  const handleCancelInvite = async () => {
    if (!inviteToCancel) return;

    try {
      setCancelLoading(true);
      const res = await fetch(
        `/api/admin/team/invitations/${inviteToCancel.id}`,
        {
          method: "DELETE",
        },
      );
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to cancel invitation");
      }

      toast.success("Invitation cancelled");
      setInviteToCancel(null);
      fetchTeamData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel invitation");
    } finally {
      setCancelLoading(false);
    }
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    try {
      setEditLoading(true);
      setEditError(null);

      const res = await fetch(`/api/admin/team/members/${editingMember.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to update member role");
      }

      toast.success(`Role updated for ${editingMember.user.email}`);
      setEditingMember(null);
      fetchTeamData();
    } catch (err: unknown) {
      setEditError(
        err instanceof Error ? err.message : "Failed to update role",
      );
    } finally {
      setEditLoading(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToDelete) return;

    try {
      setDeleteLoading(true);
      const res = await fetch(`/api/admin/team/members/${memberToDelete.id}`, {
        method: "DELETE",
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to remove team member");
      }

      toast.success(`Member ${memberToDelete.user.email} removed`);
      setMemberToDelete(null);
      fetchTeamData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to remove member");
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredMembers = members.filter(
    (m) =>
      m.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.user.fullName &&
        m.user.fullName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      m.role.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredInvitations = invitations.filter(
    (inv) =>
      inv.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.role.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const ownerCount = members.filter((m) => m.role === "owner").length;
  const adminCount = members.filter((m) => m.role === "admin").length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🛡️</span>
            <h1 className="text-xl font-bold font-heading text-slate-800">
              Team &amp; Access Control
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Manage organization members, assign operational roles, and invite
            new collaborators with scoped permissions.
          </p>
        </div>

        {/* <button
          type="button"
          onClick={() => {
            setInviteError(null);
            setIsInviteModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
        >
          <span>➕</span>
          <span>Invite Member</span>
        </button> */}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Total Members
          </div>
          <div className="text-2xl font-bold font-heading text-slate-800 mt-1">
            {members.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Active team collaborators
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Owners &amp; Admins
          </div>
          <div className="text-2xl font-bold font-heading text-slate-800 mt-1">
            {ownerCount + adminCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {ownerCount} Owner{ownerCount === 1 ? "" : "s"}, {adminCount} Admin
            {adminCount === 1 ? "" : "s"}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Pending Invites
          </div>
          <div className="text-2xl font-bold font-heading text-amber-600 mt-1">
            {invitations.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Awaiting acceptance
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Navigation Tabs and Search */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab("members")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
                activeTab === "members"
                  ? "bg-rose-50 text-rose-600"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span>Active Members</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  activeTab === "members"
                    ? "bg-rose-200/60 text-rose-700"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {members.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("invitations")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
                activeTab === "invitations"
                  ? "bg-rose-50 text-rose-600"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span>Pending Invitations</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  activeTab === "invitations"
                    ? "bg-rose-200/60 text-rose-700"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {invitations.length}
              </span>
            </button>
          </div>

          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder="Search team..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-rose-400 bg-slate-50/50"
            />
          </div>
        </div>

        {/* Error banner if loading failed */}
        {error && (
          <div className="p-4 bg-red-50 border-b border-red-100 text-red-700 text-xs font-medium flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={fetchTeamData}
              className="underline font-bold hover:text-red-800"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="w-8 h-8 rounded-full border-2 border-slate-300 border-t-rose-500 animate-spin mx-auto mb-3" />
            <p className="text-xs font-semibold">Loading team members...</p>
          </div>
        ) : activeTab === "members" ? (
          /* Members Table */
          <div className="overflow-x-auto">
            {filteredMembers.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <span className="text-3xl block mb-2">👥</span>
                <p className="text-xs font-semibold text-slate-600">
                  No members found
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {searchQuery
                    ? "Try matching another search query."
                    : "Invite colleagues to join your store."}
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/60 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">
                    <th className="py-3 px-4">Member</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Joined Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredMembers.map((member) => {
                    const roleInfo =
                      ROLE_DESCRIPTIONS[member.role] || ROLE_DESCRIPTIONS.staff;
                    const isOwner = member.role === "owner";

                    return (
                      <tr
                        key={member.id}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs shrink-0">
                              {member.user.fullName
                                ? member.user.fullName.charAt(0).toUpperCase()
                                : member.user.email.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-800 truncate">
                                {member.user.fullName ||
                                  member.user.email.split("@")[0]}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate">
                                {member.user.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${roleInfo.badgeClass}`}
                          >
                            <span>{roleInfo.icon}</span>
                            <span className="capitalize">{member.role}</span>
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-slate-500">
                          {new Date(member.createdAt).toLocaleDateString(
                            undefined,
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            },
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingMember(member);
                                setSelectedRole(member.role);
                                setEditError(null);
                              }}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-[11px] font-semibold transition-colors cursor-pointer"
                            >
                              Edit Role
                            </button>

                            {!isOwner && (
                              <button
                                type="button"
                                onClick={() => setMemberToDelete(member)}
                                className="px-2.5 py-1 rounded-lg border border-red-100 text-red-600 hover:bg-red-50 text-[11px] font-semibold transition-colors cursor-pointer"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          /* Pending Invitations Table */
          <div className="overflow-x-auto">
            {filteredInvitations.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <span className="text-3xl block mb-2">✉️</span>
                <p className="text-xs font-semibold text-slate-600">
                  No pending invitations
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Send invitations to colleagues to grant them access to this
                  store.
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/60 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">
                    <th className="py-3 px-4">Invited Email</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Sent At</th>
                    <th className="py-3 px-4">Expires In</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredInvitations.map((inv) => {
                    const roleInfo =
                      ROLE_DESCRIPTIONS[inv.role] || ROLE_DESCRIPTIONS.staff;
                    const daysRemaining = Math.max(
                      0,
                      Math.ceil(
                        (new Date(inv.expiresAt).getTime() - Date.now()) /
                          (1000 * 60 * 60 * 24),
                      ),
                    );

                    return (
                      <tr
                        key={inv.id}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          {inv.email}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${roleInfo.badgeClass}`}
                          >
                            <span>{roleInfo.icon}</span>
                            <span className="capitalize">{inv.role}</span>
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-slate-500">
                          {new Date(inv.createdAt).toLocaleDateString(
                            undefined,
                            {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-slate-500 font-medium">
                          {daysRemaining > 0 ? (
                            <span className="text-emerald-600">
                              {daysRemaining} days remaining
                            </span>
                          ) : (
                            <span className="text-red-500">Expired</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleResendInvite(inv.id)}
                              disabled={resendingId === inv.id}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-[11px] font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              {resendingId === inv.id ? "Sending..." : "Resend"}
                            </button>

                            <button
                              type="button"
                              onClick={() => setInviteToCancel(inv)}
                              className="px-2.5 py-1 rounded-lg border border-red-100 text-red-600 hover:bg-red-50 text-[11px] font-semibold transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* MODAL 1: Invite Member */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold font-heading text-slate-800">
                Invite Team Member
              </h2>
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {inviteError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-medium">
                {inviteError}
              </div>
            )}

            <form onSubmit={handleSendInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="colleague@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-rose-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Assign Role
                </label>
                <div className="space-y-2">
                  {ADMIN_ROLES.map((r) => {
                    const info = ROLE_DESCRIPTIONS[r];
                    const isSelected = inviteRole === r;

                    return (
                      <div
                        key={r}
                        onClick={() => setInviteRole(r)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                          isSelected
                            ? "border-rose-500 bg-rose-50/40 shadow-xs"
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <span className="text-lg">{info.icon}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800">
                              {info.title}
                            </span>
                            <span
                              className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                                isSelected
                                  ? "border-rose-500 bg-rose-500"
                                  : "border-slate-300"
                              }`}
                            >
                              {isSelected && (
                                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                              )}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {info.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {inviteLoading ? "Sending..." : "Send Invitation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit Role */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold font-heading text-slate-800">
                  Edit Member Role
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {editingMember.user.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="text-slate-400 hover:text-slate-600 p-1 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {editError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-medium">
                {editError}
              </div>
            )}

            <form onSubmit={handleUpdateRole} className="space-y-4">
              <div className="space-y-2">
                {ADMIN_ROLES.map((r) => {
                  const info = ROLE_DESCRIPTIONS[r];
                  const isSelected = selectedRole === r;

                  return (
                    <div
                      key={r}
                      onClick={() => setSelectedRole(r)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                        isSelected
                          ? "border-rose-500 bg-rose-50/40 shadow-xs"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <span className="text-lg">{info.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800">
                            {info.title}
                          </span>
                          <span
                            className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                              isSelected
                                ? "border-rose-500 bg-rose-500"
                                : "border-slate-300"
                            }`}
                          >
                            {isSelected && (
                              <span className="w-1.5 h-1.5 rounded-full bg-white" />
                            )}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {info.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {editLoading ? "Saving..." : "Save Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Remove Member Confirmation */}
      {memberToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-lg mb-3">
              ⚠️
            </div>
            <h3 className="text-base font-bold font-heading text-slate-800">
              Remove Team Member?
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Are you sure you want to remove{" "}
              <strong className="text-slate-700">
                {memberToDelete.user.email}
              </strong>
              ? They will immediately lose access to this organization and its
              administrative dashboard.
            </p>

            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setMemberToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRemoveMember}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {deleteLoading ? "Removing..." : "Yes, Remove"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Cancel Invite Confirmation */}
      {inviteToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-base font-bold font-heading text-slate-800">
              Cancel Invitation?
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Are you sure you want to revoke the invitation sent to{" "}
              <strong className="text-slate-700">{inviteToCancel.email}</strong>
              ? The invitation link will immediately become invalid.
            </p>

            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setInviteToCancel(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer"
              >
                Keep Active
              </button>
              <button
                type="button"
                onClick={handleCancelInvite}
                disabled={cancelLoading}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {cancelLoading ? "Cancelling..." : "Cancel Invite"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
