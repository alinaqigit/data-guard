DLP Project Problems List

Tackling from UI first:

1. Replace dummy data on dashboard with actual data received from backend.
2. In the dashboard, change the Quick Report Options to also include Report Type apart from File Type. (Quick, Full, Deep). File Type only being: "PDF", "XLSX", "JSON".
3. Fix system metrics (ie. CPU, RAM, Network Usages) in the Live Monitor page to be fetched real time instead of being dummy. (resolved)
4. Fix the "active sessions" in the live monitor be fetched real time time. (resolved)
5. Remove "Model Sensitivity" settings (no use) from the Live Monitor page.(resolved)
6. Fix: the toggles (Real-time Monitoring, Auto-response, Push Notifications) should work instead for just being for show. (resolved)
7. The three metrics (Critical Alerts, Warnings, Active Sessions) should be distinctive and should be logically divided to actually be categorized accordingly, apart from being pulled realtime from the backend. (resolved)
8. Fix the Scan Configurations in the Content Scanner Page to only show the option to add a specific path to scan, only when "Custom Path" is selected from the Scan Type drop down which contains (Quick Scan (Fast), Full Scan (Slow), Custom Path).
9. Fix the Model Configurations to actually adjust the "Confidence in Detection" bar with percentage accordingly as per the selection from the drop down for "Model Sensitivity". The options for Model Sensitivity drop down include (Low, Medium, High). Low means, model has the highest confidence (uses the base model), medium means it uses the small model, high means it uses the tiny model (but the lowest confidence).
10. Fix scanner preferences in the Content Scanner page to actually be able to add "Excluded Keywords" and "Whitelisted Paths" and save them and display them as tags (with cross mark on each tag to remove it if needed). Right now they are just for show.
11. In the Scanner Preferences in the Content Scanner page, add the proper functionalities to add multiple Excluded Keywords at once, and separate them with a comma (,). For example: "ticket, train" should be counted different words because of the comma.
12. Fix the Alerts Center page to actually properly display the actual alerts being generated (whether by the Live Monitor or the Content Scanner). And have buttons to delete each alert separately. Also, make the "Delete All" button functional.
13. In the Policies page, fix the fact that as we click the "New Policy" button, it automatically creates a policy without any dialog appearing for the user to set anything.
14. In the policies page, fix the Policy Statistics to actually show the policy implementation percentage realtime (eg. 100% if all are enforced, and so on). Also fix the "Violations Today" metric to actually show the violations of the enforced policies in the Today's timeframe. Same for the Policy Coverage Metric percentage.
15. Also, fix the problem in the "Edit" Dialog of a Policy. Change the manual text field for "Type" to a list/dropdown to choose from pre-defined ones (ie. Type only two, either a "Keyword" or a "RegEx Pattern"). For the "Pattern" text field, firstly its name doesn't flow logically if we change the type to a keyword. So, its label should be something that fits in with both. If "Keyword" is selected, the user can manually type a word and save. If "RegEx Pattern" is selected, the user must not manually enter anything, instead choose from a list of predefined ones with names (ie. CNIC, Phone Number (Pakistani), IBAN, Email etc.).
16. In the Reports Page, firstly, need to change the Report Type drop down to include "Quick, Full, Deep" Reports. Date Range drop down to simply include: "Today's Report, Weekly Report, Up till Today".
17. Only output formats to be allowed: "PDF, XLSX, JSON".
18. Remove "Preview Report" button, because it is extra work, with minimal worth.
19. Make the download button actually work to download the report.
20. Make the fully implemented Report Generation Engine that actually handles all this work accordingly.
21. In the Threats page, make sure that the threats get sorted according to the logic: "Active Threats", "Investigating", "Quarantined", "Resolved". This can be done manually by the user. But the auto-response usually handles this by itself, if enabled.
22. Remove the "Logout" button from the side navbar. The logout being in the "My Profile" page is enough.
23. Fix the color palette according to the color codes already planned. Also fix the fonts to the pre-planned ones along with weights.
24. The "Scan Started Successfully" toast notification appears AFTER the scan is completed. Secondly, no Scan completed notification appears.



Changes and fixes need to be substantiated in the backend/core engines

1. Make the app powerful enough to be able to delete the files that contain leaks, if the user wants it so.
2. Make the app be able to encrypt files (the most logical solution) if the user wants so, to mitigate the leak. This feature works by default if "Auto Response" is enabled.
3. Fix the numbering issue for threat and scan IDs. The current problem is that each new Scan/Threat entry in the records takes the IDs of the first record. For example, initially if only one entry, SC-1000. Another entry come in and now it becomes, SC-1000 (the new entry), SC-1001 (the old entry).
4. Proper implementation for the frontend to be able to fetch realtime updates from the backend. Most likely Through SocketIO or WebSockets etc. (resolved)
5. Need for the app to resolve paths on the PCs its running on, automatically, so Paths aren't hardcoded. Just a few restrictions apply such as; can't scan system's own paths etc. This will help for Content Scanner's Scans (Quick, Full, Custom etc.) and also help the Live Monitor, monitor the system in real time by itself. Just one thing to note is, the Live Monitor only detects and reports when it spots a change somewhere. That way, the app doesn't crash with constant minuet updates.
6. Proper Policy Engine implementation, right now, keywords based policies are enforced and work, but regex pattern based ones don't. The scans turn out empty where leaks should have been detected.





Well... initially you worked amazingly well. But now.... you're starting to deteriorate in the quality of work you deliver. There are new problems now. Firstly, I don't want a dropdown for changing the status of the threats. Simple buttons there represented by appropriate icons should do the trick. Secondly, there's a problem with the Content Scanner's scanner records. If I delete all of them, and run a single scan, it simply brings back some old data. Thirdly, the dashboard's dummy data problem still hasn't been solved. It still has dummy data on some parts. And if threats and scans records are completely cleaned, the dashboard displays dummy data in there. Fourthly, for the Quarantine action, it should actually do something... It should move the file to a dedicated "Quarantine" location it should create for the files. I also think it's high time we then move toward solve the problem of adding the functionality of encrypting and deleting files. These actions matter a lot. Next, there's this problem that with every threat record, there's an eye icon, but it does nothing when clicked. It should actually display details about that specific threat. Also, the "Delete All Threats" button is not there to delete all of the threats.

Understand this: Deleting or Encrypting files are both methods of solving a threat. Encryption is the safe method while Deletion is the destructive but sure short method. Both options should exist in the threats page and should be actually working. Also, remember that the "Auto Response" toggle in the Live Monitor also requires this encryption tech to be implemented. So, you see there's a heck ton of interconnected things that we're losing track of.



Before anything, I'd also like to add this: The live scanner also currently doesn't really... work, I guess. Because I haven't really seen it in action. I mean, in theory, it should use the Content Scanner's tech for itself, but automatically. And also, what about path resolution? How do these resolve paths on their own? It's not like we're giving them hardcoded paths to only work on. They need to resolve paths to monitor/scan on their own. But... need to make sure that they don't touch system paths (which already mitigates most of the C drive paths). And the Live Monitor's working isn't to update every second, but to only detect and do something whenever it detects a CHANGE anywhere it is able to monitor (ie. A file moved, deleted, changed, a path mvoed, deleted, changed etc.). And then again, we need to also fix other things as well. That I haven't told you yet I guess.



This is the "Live" scanner/monitor we're talking about. It does things automatically, no? I'm finding it a bit difficult to explain but fundamentally speaking, what we're doing is that we need a way for the app to resolve paths on the computer (it should leave the system paths out). But we need to distinguish between live monitor and content scanner. Live monitor MUST be doing it automatically and monitoring stuff. While, if you remember, the content scanner had the "Quick Scan, Deep Scan, Custom Path" scan options, right? For the custom path, it only has to scan the path given in by the user. But for Quick and Deep scans, it needs to have paths resolved upon which it will scan. The user won't be telling it, right?

