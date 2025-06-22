import { notFound } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { MemberService } from "@/lib/db";

interface EditProfilePageProps {
  params: { id: string };
}

export default async function EditProfilePage({ params }: EditProfilePageProps) {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  const member = await MemberService.getMemberById(params.id);

  if (!member || user?.id !== member.id) {
    notFound();
  }

  return (
    <div className="container max-w-2xl py-12">
      <h1 className="text-3xl font-bold mb-8">Edit Profile</h1>
      <form className="space-y-6">
        <div>
          <label className="block mb-1 font-medium">Name</label>
          <input
            type="text"
            name="name"
            defaultValue={member.name}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Email</label>
          <input
            type="email"
            name="email"
            defaultValue={member.email}
            className="w-full border rounded px-3 py-2"
            disabled
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Domain</label>
          <input
            type="text"
            name="domain"
            defaultValue={member.domain}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Year of Study</label>
          <input
            type="number"
            name="year_of_study"
            defaultValue={member.year_of_study}
            className="w-full border rounded px-3 py-2"
            min={1}
            max={10}
          />
        </div>
        <button type="submit" className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded font-semibold">
          Save Changes
        </button>
      </form>
    </div>
  );
} 