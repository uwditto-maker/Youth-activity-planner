# Setting up Trailhead

You do this once. It takes about 10 minutes, on a computer.

## Part 1: Turn on the GitHub Pages site (2 minutes)

This gives Trailhead a web address you can open on any phone.

1. On GitHub, open the **Youth-activity-planner** repository, then go to **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
3. Set **Branch** to `claude/sleepy-fermat-27arb9` and the folder to **/ (root)**. Click **Save**.
4. Wait about a minute and refresh the page. GitHub shows the address: **https://uwditto-maker.github.io/Youth-activity-planner/**

The repository is public, so anyone can see the app's code. None of your ward's data is stored there. Names and plans live only in your Google Sheet and on your phones.

## Part 2: Connect the shared Google Sheet (8 minutes)

The **Trailhead – Youth Activities** folder in your Google Drive holds the **Trailhead Data** sheet. A small script inside the sheet lets the app save to it and read from it.

1. Open **Trailhead Data**. Click **Extensions → Apps Script**.
2. Delete everything in the editor. Paste in the entire contents of `apps-script/Code.gs`. A copy is in the same Drive folder, and the file is also in the GitHub repository.
3. Near the top, change `const PASSCODE = 'CHANGE-ME';` to a phrase only your leaders will know, for example `'priest-lake-2027'`. Keep the quote marks.
4. Click **Save** (the disk icon). You can name the project "Trailhead sync".
5. Click **Deploy → New deployment**. Click the gear icon next to "Select type" and choose **Web app**.
   - **Execute as:** Me
   - **Who has access:** Anyone
6. Click **Deploy**. Google asks you to authorize access:
   - Choose your account.
   - If Google shows "Google hasn't verified this app", click **Advanced**, then **Go to Trailhead sync**. The warning appears because you wrote the script yourself; it only touches this one sheet.
   - Click **Allow**.
7. Copy the **Web app URL**. It ends in `/exec`.
8. On your iPhone, open the GitHub Pages address in Safari. Go to **Settings → Shared Google Sheet**. Paste the URL, enter the passcode and tap **Connect**.
9. Tap **Share → Add to Home Screen** so Trailhead opens like an app.

### Adding other leaders and youth leaders

Send them the GitHub Pages address, the web app URL and the passcode, for example in a private message. They connect the same way, in step 8. They don't need access to your Google Drive.

### What you'll see in the sheet

After the first sync, the sheet gets these tabs:

- **Activities**
- **Youth**
- **Leaders**
- **Attendance**

They are for reading and printing. The app overwrites them on every save, so make changes in the app. A hidden `_data` tab holds everything the app needs; don't edit it.

### Good to know

- **Offline:** changes are saved on the phone and sync the next time it has a signal.
- **Two people editing:** two people can edit at the same time. If they both change the same activity before syncing, the most recent save of that activity wins. Different activities or different people never overwrite each other.
- **Passcode:** to change it, edit `PASSCODE`, then go to **Deploy → Manage deployments → Edit (pencil) → Version: New version → Deploy**. The URL stays the same. Everyone then reconnects with the new passcode.
- **Updating the script:** if `Code.gs` changes later, paste the new version and redeploy with **New version** as above.
- **Privacy:** the sheet holds youth names and parents' contact details. Share the passcode only with leaders and youth leaders who need it. Don't store medical details; the app tracks only whether each form was received.
