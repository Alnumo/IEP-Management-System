import React, { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'

export function LoginForm() {
  const [email, setEmail] = useState('admin@arkan-center.com')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [user, setUser] = useState<any>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
      } else {
        setUser(data.user)
        console.log('✅ Logged in successfully:', data.user)
        
        // Check user role
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, name')
          .eq('id', data.user.id)
          .single()
        
        if (profile) {
          console.log('👤 User role:', profile.role)
        }
      }
    } catch (err) {
      setError('An unexpected error occurred')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (!error) {
      setUser(null)
      console.log('✅ Logged out successfully')
    }
  }

  // Check current auth status on mount
  React.useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  if (user) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>مرحباً - Welcome</CardTitle>
          <CardDescription>You are logged in as {user.email}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Now you can create therapy plans that will save to the database!
          </p>
          <Button onClick={handleLogout} variant="outline" className="w-full">
            تسجيل الخروج - Logout
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>تسجيل الدخول - Admin Login</CardTitle>
        <CardDescription>
          Log in with admin credentials to create therapy plans
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول - Login'}
          </Button>
        </form>
        
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Test Credentials:</h4>
          <p className="text-xs text-muted-foreground">
            Email: admin@arkan-center.com<br/>
            Password: Admin123!<br/>
            <em>Create this user in Supabase Dashboard first</em>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}