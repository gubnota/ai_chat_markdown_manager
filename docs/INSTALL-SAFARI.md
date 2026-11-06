# Safari / Userscripts installation

The output is a standalone userscript. Automated WebKit tests pass; installation through the actual Safari Userscripts extension has not been manually verified in this environment.

1. Install **Userscripts** from the link maintained by the [official project](https://github.com/quoid/userscripts).
2. Open Safari → Settings → Extensions and enable Userscripts. On iOS/iPadOS, use the Safari Extensions section in system Settings; the exact location depends on OS version.
3. Grant Userscripts access to the intended chat websites. Prefer individual sites over unrelated website access.
4. Open the Userscripts app and locate its configured scripts directory. Use its directory-selection/open controls; do not assume a fixed filesystem path. Grant folder access when requested.
5. Extract [the release ZIP](../AI-Chat-Markdown-Manager-v2.2.0.zip) or obtain [the distributable](../dist/AI-Chat-Markdown-Manager.user.js). Copy the complete `.user.js` into that directory, preserving the extension.
6. In the extension's script list/editor, ensure **AI Chat Markdown Manager** is enabled.
7. Disable **Save Page as Markdown (Safari)** v1.2.0 and other copies in every userscript manager. Reload the target conversation.
8. Look for a small floating file icon. Alt+Shift+E restores a hidden overlay; Alt+Shift+M saves Markdown.

## Upgrade

Replace the previous v2 file in the same directory. Keep exactly one active installation, check its version is 2.2.0, and reload existing tabs. Replacing the script does not deliberately clear preferences. Old Markdown booleans and FAB coordinates are migrated when available; site storage remains separate per origin.

## If the icon is absent

- Check both extension enablement and permission for the current website, including private-window permissions if relevant.
- Check that the configured directory contains the actual script, not the ZIP or an HTML download page.
- Confirm the site's exact host/path appears in [PLATFORMS.md](PLATFORMS.md); there is no global wildcard.
- Reload after installation. Check the Userscripts editor for parsing errors and duplicate versions.
- A website may restrict injection or change its DOM. Collect browser/version, script version and a redacted error; never send conversation contents or cookies.

Modern CSS and ES2022 are used. Passing desktop/mobile WebKit automation does not guarantee every Safari/OS/extension combination. Browser download prompts, folder access and clipboard permissions remain under Safari's control.

## Кратко по-русски

Установите Userscripts по официальной ссылке, включите расширение Safari и разрешите нужный сайт. В приложении Userscripts откройте выбранную папку скриптов, скопируйте туда полный `.user.js`, включите его, отключите старые версии и перезагрузите чат. Для обновления замените файл, не создавая второй активной копии. Если кнопки нет, проверьте папку, разрешения, совпадение адреса и Alt+Shift+E. Проверка расширения Safari вручную ещё требуется.

## YouTube and batch exports in v2.2

Allow YouTube in the extension and reload existing video tabs after upgrading. Open **YouTube timedtext**: languages are detected automatically, and **Download TXT/VTT** fetches and converts directly without a saved source file. ChatGPT/Gemini/Claude ZIP exports load selected native chat links automatically and restore the initial chat; loading may mark chats read. Missing native links or restricted captions produce visible errors.

## Batch archive and delete

Reload after upgrading. Open **Manage conversations**, select discovered chats and choose **Archive** (ChatGPT) or **Delete** (ChatGPT/Gemini). Review the frozen list; deletion requires `DELETE`, or `DELETE ALL` for all discovered chats. Missing native controls keep actions unavailable. After ZIP export, Activity → **Review backed-up chats** offers the same actions for successful exports after checking the files. ChatGPT archives can be restored in its Archived chats settings; deletion is irreversible.
