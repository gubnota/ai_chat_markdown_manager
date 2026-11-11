# Tampermonkey installation

See the [official website](https://www.tampermonkey.net/) and [FAQ](https://www.tampermonkey.net/faq.php) for browser-specific installation and permissions. The Chromium bundle is tested by injection into a fixture; the full extension installation flow has not been manually verified here.

1. Install the official Tampermonkey extension for your browser and enable it.
2. Run `npm ci` and `npm run build` in the repository; use the generated `dist/AI-Chat-Markdown-Manager.user.js` or extract the local release ZIP.
3. Open Tampermonkey Dashboard → create a new script. Replace the entire template with `AI-Chat-Markdown-Manager.user.js`, including its metadata header.
4. Save and enable it. Alternatively, use the dashboard's file import utility to import the `.user.js`; check the imported name/version before enabling.
5. Grant the extension permission for the intended chat sites and any userscript-execution permission required by the current browser. Follow Tampermonkey's prompt if the browser requires an additional setting.
6. Confirm a matching rule covers the site's exact URL. All 48 inherited rules plus 3 targeted YouTube rules are retained; no universal match is added.
7. Disable old/duplicate copies and reload the target tab. Open the floating file icon.

## Upgrade and troubleshooting

Edit/replace the existing script with the full new distributable and save, rather than leaving both versions enabled. Reload open chat tabs. If importing creates another copy, disable/remove the older copy.

If no icon appears, check the extension's script list for that tab, its global enable switch, site access and URL match. Alt+Shift+E restores a hidden icon. A ZIP, GitHub HTML page or truncated paste is not executable userscript content. If clipboard fails, download Markdown instead. Disable other copies in Safari Userscripts or another extension too.

The script uses `@grant none`, no privileged manager API and no remote runtime dependencies. It does not require credentials, API keys or a local development server.

## Кратко по-русски

Установите и включите Tampermonkey. В панели управления создайте скрипт, замените шаблон полным `.user.js`, сохраните и включите. Можно импортировать сам `.user.js` через средства панели. Разрешите нужные сайты и выполнение userscript, если браузер запросит. Отключите старые копии, перезагрузите чат. Обновляйте существующую установку; при отсутствии кнопки проверьте разрешения, список скриптов текущей вкладки, точный URL и Alt+Shift+E.

## YouTube and batch exports in v2.2

Allow YouTube in the extension and reload existing video tabs after upgrading. Open **YouTube timedtext**: languages are detected automatically, and **Download TXT/VTT** fetches and converts directly without a saved source file. ChatGPT/Gemini/Claude ZIP exports load selected native chat links automatically and restore the initial chat; loading may mark chats read. Missing native links or restricted captions produce visible errors.

## Batch archive and delete

Reload after upgrading. Open **Manage conversations**, select discovered chats and choose **Archive** (ChatGPT) or **Delete** (ChatGPT/Gemini). Review the frozen list; deletion requires `DELETE`, or `DELETE ALL` for all discovered chats. Missing native controls keep actions unavailable. After ZIP export, Activity → **Review backed-up chats** offers the same actions for successful exports after checking the files. ChatGPT archives can be restored in its Archived chats settings; deletion is irreversible.
