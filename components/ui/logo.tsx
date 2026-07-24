import Link from 'next/link'
import Image from 'next/image'
import logo from '@/public/logo.svg'

export default function Logo() {
  return (
    <Link href="/" className="block" aria-label="Cruip">
      <div className="flex items-center">
        <Image src={logo} alt="Point Blank" className="h-7 w-auto md:h-8" priority />
      </div>
    </Link>
  )
}
