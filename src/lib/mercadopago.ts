import { MercadoPagoConfig, Preference, Payment } from "mercadopago"

let client: MercadoPagoConfig | null = null

function getClient() {
  if (!client) {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
    if (!accessToken) throw new Error("MERCADOPAGO_ACCESS_TOKEN no configurado")
    client = new MercadoPagoConfig({ accessToken })
  }
  return client
}

export function getPreferenceApi() {
  return new Preference(getClient())
}

export function getPaymentApi() {
  return new Payment(getClient())
}
