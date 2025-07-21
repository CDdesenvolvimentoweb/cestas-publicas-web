import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateAdminRequest {
  email: string
  password: string
  full_name: string
  cpf?: string
  phone?: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create admin Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Parse request body
    const body: CreateAdminRequest = await req.json()
    console.log('Creating admin user:', { email: body.email })

    // Create user using admin client with specified password
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: body.full_name,
        cpf: body.cpf,
        phone: body.phone,
        role: 'admin'
      }
    })

    if (createError) {
      console.error('Error creating admin user:', createError)
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!newUser.user) {
      return new Response(
        JSON.stringify({ error: 'Failed to create admin user' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Admin user created successfully:', newUser.user.id)

    // Create admin profile
    const { error: profileInsertError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: newUser.user.id,
        full_name: body.full_name,
        cpf: body.cpf,
        phone: body.phone,
        role: 'admin',
        management_unit_id: null, // Admins don't need specific management unit
        is_active: true
      })

    if (profileInsertError) {
      console.error('Error creating admin profile:', profileInsertError)
      // Try to clean up the created user
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      return new Response(
        JSON.stringify({ error: `Profile creation failed: ${profileInsertError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Admin profile created successfully')

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: {
          id: newUser.user.id,
          email: newUser.user.email
        },
        message: 'Usuário admin criado com sucesso.'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})