const https = require('https'), crypto = require('crypto')

let pks = {}, pksExpire = 0

const getpks = () => new Promise((r, rej) => {
  const req = https.request('https://cn.api.aauth.link/auth/', { method: 'GET' }, res => {
    let data = ''
    res.on('data', chunk => data += chunk)
    res.on('end', () => { r(JSON.parse(data)) })
  })
  req.on('error', rej)
  req.end()
})

function verify (jwt) {
  try {
    const raw = jwt.split('.')
    const header = JSON.parse(Buffer.from(raw[0], 'base64url').toString())
    const pk = pks[header.kid]
    if (!pk) return false
    if (!crypto.verify('rsa-sha256', Buffer.from(raw[0] + '.' + raw[1]), { key: crypto.createPublicKey(pk), padding: crypto.constants.RSA_PKCS1_PSS_PADDING, saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST }, Buffer.from(raw[2], 'base64url'))) return false
    return JSON.parse(Buffer.from(raw[1], 'base64url').toString())
  } catch { return false }
}

module.exports = async (token, aud = 'aboard', expire = 86400e3) => {
  if (!token) return false
  if (pksExpire < Date.now()) {
    pks = await getpks()
    pksExpire = Date.now() + 864000e3
  }
  const v = verify(token)
  if (!v || v.iss !== 'aauth' || v.aud !== aud || v.iat + expire < Date.now()) return false
  return v
}