# Gmail SMTP Setup

The backend needs real Gmail credentials to actually send OTP emails.
Currently `backend/.env` contains placeholders, which is why Gmail returns
`5.7.8 Username and Password not accepted`.

## Get a Gmail App Password (one-time setup)

1. Open https://myaccount.google.com/security
2. Enable **2-Step Verification** (required)
3. Go to https://myaccount.google.com/apppasswords
4. App: **Mail**, Device: **Other** → name it "Personal AI"
5. Click **Generate**
6. Copy the **16-character password** (e.g. `abcd efgh ijkl mnop`)

## Edit backend/.env

Replace these three lines with your real values:

```
SMTP_USER=youremail@gmail.com
SMTP_PASS=abcdefghijklmnop   # 16 chars, no spaces
SMTP_FROM=youremail@gmail.com
```

Then restart the backend. The startup banner will print
`SMTP configured: True`.
