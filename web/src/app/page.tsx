/** @jsxImportSource react */
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Upload,
  Trash2,
  PencilLine,
  ShieldCheck,
  LogOut,
  Database,
  Download,
  RefreshCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

type Me = {
  id: string;
  email: string;
  limitBytes: number;
  usedBytes: number;
  createdAt: string;
};

type FileItem = {
  id: string;
  userId: string;
  originalName: string;
  storageKey: string;
  size: number;
  mimeType?: string;
  uploadedAt: string;
};

type Health = {
  status: string;
  storageBackend: string;
};

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [me, setMe] = useState<Me | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const headers = useMemo(
    () =>
      token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : undefined,
    [token]
  );

  const fetchMe = useCallback(async () => {
    if (!headers) return;
    const res = await fetch(`${API_URL}/me`, { headers });
    if (res.ok) {
      setMe(await res.json());
    } else {
      setToken(null);
    }
  }, [headers]);

  const fetchFiles = useCallback(async () => {
    if (!headers) return;
    const res = await fetch(`${API_URL}/files`, { headers });
    if (res.ok) setFiles(await res.json());
  }, [headers]);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchMe(), fetchFiles()]);
  }, [fetchFiles, fetchMe]);

  async function loadHealth() {
    try {
      const res = await fetch(`${API_URL}/health`);
      if (res.ok) setHealth(await res.json());
    } catch {
      // ignore connectivity errors
    }
  }

  useEffect(() => {
    loadHealth();
    const saved =
      typeof window !== "undefined" ? localStorage.getItem("tz-token") : null;
    if (saved) {
      setToken(saved);
    }
  }, []);

  useEffect(() => {
    if (token) {
      localStorage.setItem("tz-token", token);
      refreshAll();
    } else {
      localStorage.removeItem("tz-token");
      setMe(null);
      setFiles([]);
    }
  }, [token, refreshAll]);

  async function login() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        setMessage("เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบข้อมูล");
        return;
      }
      const data = await res.json();
      setToken(data.token);
      setMessage("เข้าสู่ระบบสำเร็จ");
    } catch {
      setMessage("เกิดข้อผิดพลาดในการเข้าสู่ระบบ");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(file?: File | null) {
    if (!file || !headers) return;
    setUploading(true);
    setMessage(null);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_URL}/files/upload`, {
      method: "POST",
      headers,
      body: form,
    });
    if (res.ok) {
      setMessage("อัพโหลดสำเร็จ");
      await refreshAll();
    } else {
      const err = await res.json().catch(() => ({}));
      setMessage(err?.message || "อัพโหลดไม่สำเร็จ");
    }
    setUploading(false);
  }

  async function handleDelete(id: string) {
    if (!headers) return;
    const res = await fetch(`${API_URL}/files/${id}`, {
      method: "DELETE",
      headers,
    });
    if (res.ok) {
      setFiles((prev) => prev.filter((f) => f.id !== id));
      await fetchMe();
    }
  }

  async function handleRename(id: string) {
    if (!headers) return;
    const name = prompt("ตั้งชื่อไฟล์ใหม่");
    if (!name) return;
    const res = await fetch(`${API_URL}/files/${id}`, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ filename: name }),
    });
    if (res.ok) {
      await fetchFiles();
    }
  }

  async function handleDownload(file: FileItem) {
    if (!headers) return;
    const res = await fetch(`${API_URL}/files/${file.id}`, { headers });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.originalName;
    a.click();
    URL.revokeObjectURL(url);
  }

  const usagePercent = me
    ? Math.min(
        100,
        Math.round((me.usedBytes / (me.limitBytes || 1)) * 100)
      )
    : 0;

  return (
    <main className="min-h-screen px-4 py-8 md:px-10 lg:px-16">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-emerald-700">TzDrive</p>
            <h1 className="text-3xl font-semibold text-slate-900">
              แดชบอร์ดการจัดเก็บไฟล์
            </h1>
            <p className="text-sm text-slate-600">
              เลือกใช้ที่จัดเก็บ Local หรือ S3 พร้อมโควตาต่อผู้ใช้
            </p>
          </div>
          {health && (
            <div className="flex items-center gap-2 rounded-full bg-white/70 px-3 py-2 shadow">
              <ShieldCheck className="h-4 w-4 text-emerald-700" />
              <span className="text-sm text-slate-700">
                Backend: {health.storageBackend}
              </span>
            </div>
          )}
        </header>

        {!token && (
          <section className="rounded-2xl bg-white/90 p-6 shadow-lg ring-1 ring-emerald-100">
            <h2 className="text-xl font-semibold text-slate-900">เข้าสู่ระบบ</h2>
            <p className="mb-4 text-sm text-slate-600">
              ใช้อีเมลและรหัสผ่านที่ผู้ดูแลระบบสร้างให้
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-sm text-slate-700">
                <span>อีเมล</span>
                <input
                  type="email"
                  className="w-full rounded-md border border-emerald-200 bg-white px-3 py-2 shadow-sm focus:border-emerald-400 focus:outline-none"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label className="space-y-1 text-sm text-slate-700">
                <span>รหัสผ่าน</span>
                <input
                  type="password"
                  className="w-full rounded-md border border-emerald-200 bg-white px-3 py-2 shadow-sm focus:border-emerald-400 focus:outline-none"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
            </div>
            <div className="mt-4 flex gap-3">
              <Button onClick={login} disabled={loading || !email || !password}>
                {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setEmail("");
                  setPassword("");
                }}
              >
                ล้างข้อมูล
              </Button>
            </div>
            {message && (
              <p className="mt-3 text-sm text-emerald-700">{message}</p>
            )}
          </section>
        )}

        {token && me && (
          <>
            <section className="rounded-2xl bg-white/90 p-5 shadow-lg ring-1 ring-emerald-100">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    สวัสดี, {me.email}
                  </h2>
                  <p className="text-sm text-slate-600">
                    โควต้า {formatBytes(me.limitBytes)} • ใช้ไป{" "}
                    {formatBytes(me.usedBytes)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-emerald-700" />
                  <span className="text-sm text-slate-700">
                    พื้นที่ใช้ {usagePercent}%
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setToken(null);
                      setMessage("ออกจากระบบแล้ว");
                    }}
                  >
                    <LogOut className="mr-1 h-4 w-4" />
                    ออกจากระบบ
                  </Button>
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-emerald-50">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            </section>

            <section className="rounded-2xl bg-white/90 p-5 shadow-lg ring-1 ring-emerald-100">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    อัพโหลดไฟล์
                  </h3>
                  <p className="text-sm text-slate-600">
                    รองรับสูงสุด {formatBytes(50 * 1024 * 1024)} ต่อไฟล์
                  </p>
                </div>
                <label className="flex items-center gap-3 text-sm text-slate-700">
                  <Upload className="h-5 w-5 text-emerald-700" />
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => handleUpload(e.target.files?.[0])}
                    disabled={uploading}
                  />
                  <Button asChild disabled={uploading}>
                    <span>เลือกไฟล์</span>
                  </Button>
                </label>
              </div>
              {message && (
                <p className="mt-2 text-sm text-emerald-700">{message}</p>
              )}
            </section>

            <section className="rounded-2xl bg-white/90 p-5 shadow-lg ring-1 ring-emerald-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">
                  ไฟล์ของฉัน
                </h3>
                <Button variant="ghost" size="sm" onClick={refreshAll}>
                  <RefreshCcw className="mr-1 h-4 w-4" />
                  รีเฟรช
                </Button>
              </div>
              <div className="mt-4 grid gap-3">
                {files.length === 0 && (
                  <p className="text-sm text-slate-600">
                    ยังไม่มีไฟล์ อัพโหลดไฟล์แรกได้เลย
                  </p>
                )}
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex flex-col gap-2 rounded-xl border border-emerald-50 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">
                        {file.originalName}
                      </p>
                      <p className="text-xs text-slate-600">
                        {formatBytes(file.size)} • อัพโหลดเมื่อ{" "}
                        {new Date(file.uploadedAt).toLocaleString("th-TH")}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(file)}
                      >
                        <Download className="mr-1 h-4 w-4" />
                        ดาวน์โหลด
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRename(file.id)}
                      >
                        <PencilLine className="mr-1 h-4 w-4" />
                        เปลี่ยนชื่อ
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(file.id)}
                      >
                        <Trash2 className="mr-1 h-4 w-4" />
                        ลบ
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
