import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { ProfileForm } from "./profile-form"

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  return (
    <div className="max-w-xl mx-auto py-12 px-6">
      <h1 className="text-xl font-bold mb-6">Perfil</h1>
      <ProfileForm
        user={{
          name: session.user.name ?? "",
          email: session.user.email ?? "",
          image: session.user.image,
        }}
      />
    </div>
  )
}
