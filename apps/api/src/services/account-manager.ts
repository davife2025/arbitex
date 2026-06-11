import * as crypto from 'crypto'
import { supabaseAdmin } from './supabase'
import { BitgetService } from './bitget'

export interface TradingAccount {
  id: string
  user_id: string
  name: string
  exchange: string
  is_default: boolean
  is_active: boolean
  label_color: string
  note: string | null
  last_synced_at: string | null
  created_at: string
}

// Simple AES-256-GCM encryption for API keys at rest
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY ?? 'arbitex-default-key-32-bytes-pad!'
const KEY = Buffer.from(ENCRYPTION_KEY.slice(0, 32))

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

function decrypt(data: string): string {
  const [ivHex, tagHex, encHex] = data.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const enc = Buffer.from(encHex, 'hex')
  const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv)
  decipher.setAuthTag(tag)
  return decipher.update(enc).toString('utf8') + decipher.final('utf8')
}

export class AccountManager {

  async listAccounts(userId: string): Promise<TradingAccount[]> {
    const { data, error } = await supabaseAdmin
      .from('trading_accounts')
      .select('id,user_id,name,exchange,is_default,is_active,label_color,note,last_synced_at,created_at')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []) as TradingAccount[]
  }

  async addAccount(
    userId: string,
    params: {
      name: string
      apiKey: string
      apiSecret: string
      passphrase: string
      labelColor?: string
      note?: string
      makeDefault?: boolean
    }
  ): Promise<TradingAccount> {
    // Encrypt credentials
    const encrypted = {
      api_key_encrypted: encrypt(params.apiKey),
      api_secret_encrypted: encrypt(params.apiSecret),
      passphrase_encrypted: encrypt(params.passphrase),
    }

    // If making default, unset others first
    if (params.makeDefault) {
      await supabaseAdmin
        .from('trading_accounts')
        .update({ is_default: false })
        .eq('user_id', userId)
    }

    const { data, error } = await supabaseAdmin
      .from('trading_accounts')
      .insert({
        user_id: userId,
        name: params.name,
        exchange: 'bitget',
        ...encrypted,
        is_default: params.makeDefault ?? false,
        label_color: params.labelColor ?? '#00E5FF',
        note: params.note ?? null,
      })
      .select('id,user_id,name,exchange,is_default,is_active,label_color,note,last_synced_at,created_at')
      .single()

    if (error) throw new Error(error.message)
    return data as TradingAccount
  }

  async setDefault(userId: string, accountId: string): Promise<void> {
    await supabaseAdmin
      .from('trading_accounts')
      .update({ is_default: false })
      .eq('user_id', userId)

    await supabaseAdmin
      .from('trading_accounts')
      .update({ is_default: true })
      .eq('id', accountId)
      .eq('user_id', userId)
  }

  async deleteAccount(userId: string, accountId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('trading_accounts')
      .delete()
      .eq('id', accountId)
      .eq('user_id', userId)
    if (error) throw new Error(error.message)
  }

  // Test connectivity by fetching balance
  async testConnection(userId: string, accountId: string): Promise<{
    success: boolean
    balances?: any[]
    error?: string
  }> {
    const { data: account, error } = await supabaseAdmin
      .from('trading_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('user_id', userId)
      .single()

    if (error || !account) return { success: false, error: 'Account not found' }

    try {
      const apiKey = decrypt(account.api_key_encrypted)
      const apiSecret = decrypt(account.api_secret_encrypted)
      const passphrase = decrypt(account.passphrase_encrypted)

      // Create a one-off BitgetService instance with these credentials
      const tempEnv = {
        BITGET_API_KEY: apiKey,
        BITGET_API_SECRET: apiSecret,
        BITGET_PASSPHRASE: passphrase,
      }
      Object.assign(process.env, tempEnv)

      const svc = new BitgetService()
      const balances = await svc.getBalance()

      // Update last_synced_at
      await supabaseAdmin
        .from('trading_accounts')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', accountId)

      return { success: true, balances }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  async updateAccount(userId: string, accountId: string, params: {
    name?: string
    labelColor?: string
    note?: string
    isActive?: boolean
  }): Promise<TradingAccount> {
    const update: any = {}
    if (params.name !== undefined) update.name = params.name
    if (params.labelColor !== undefined) update.label_color = params.labelColor
    if (params.note !== undefined) update.note = params.note
    if (params.isActive !== undefined) update.is_active = params.isActive

    const { data, error } = await supabaseAdmin
      .from('trading_accounts')
      .update(update)
      .eq('id', accountId)
      .eq('user_id', userId)
      .select('id,user_id,name,exchange,is_default,is_active,label_color,note,last_synced_at,created_at')
      .single()

    if (error) throw new Error(error.message)
    return data as TradingAccount
  }
}

export const accountManager = new AccountManager()
