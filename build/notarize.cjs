const { notarize } = require('@electron/notarize')

// afterSign hook — called by electron-builder after the app is signed.
// Only runs when the Apple credentials are present (i.e. in CI with secrets).
// Skips silently in local dev builds where those env vars aren't set.
exports.default = async function notarizing(context) {
  if (context.electronPlatformName !== 'darwin') return
  if (!process.env.APPLE_ID) return

  const appName = context.packager.appInfo.productFilename
  const appPath = `${context.appOutDir}/${appName}.app`

  console.log(`Notarizing ${appPath}…`)

  await notarize({
    tool: 'notarytool',
    appPath,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
    teamId: process.env.APPLE_TEAM_ID,
  })

  console.log(`Notarization complete.`)
}
