import { Link } from 'react-router'
import { Header } from '../../components/layout/Header'
import { usePageTitle } from '../../lib/usePageTitle'

export default function NotFoundPage() {
  usePageTitle('Halaman Tidak Ditemukan')
  return (
    <div>
      <Header title="QaryApp" showBack={false} />
      <div className="mx-auto max-w-[720px] p-8 text-center">
        <h2 className="text-lg font-semibold text-text mb-2">
          Halaman tidak ditemukan
        </h2>
        <p className="text-sm text-text-muted mb-6">
          Halaman yang Anda tuju tidak tersedia atau telah dipindahkan.
        </p>
        <Link
          to="/"
          className="inline-flex h-11 items-center justify-center rounded-[10px] bg-primary px-6 text-sm font-medium text-primary-fg hover:opacity-90 active:opacity-80 transition-opacity"
        >
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  )
}
