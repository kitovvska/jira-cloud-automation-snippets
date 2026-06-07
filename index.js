import 'dotenv/config';

// 1. Funkcja odpowiedzialna za wysyłanie alertów na Slacka przez Webhook
async function sendSlackAlert(issueKey, issueSummary) {
  const slackUrl = process.env.SLACK_WEBHOOK_URL;

  if (!slackUrl) {
    console.error("Error: SLACK_WEBHOOK_URL is missing in .env file.");
    return;
  }

  const messagePayload = {
    text: `*CRITICAL JIRA ALERT* \n*Key:* ${issueKey}\n*Summary:* ${issueSummary}`
  };

  try {
    const response = await fetch(slackUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messagePayload)
    });

    if (response.ok) {
      console.log(`[Slack] Successfully dispatched alert for ${issueKey}`);
    } else {
      console.error(`[Slack Error] Received status code: ${response.status}`);
    }
  } catch (error) {
    console.error("[Network Error] Failed to reach Slack API:", error.message);
  }
}

// 2. Główna funkcja pobierająca zadania z Jiry i uruchamiająca alerty
async function checkJiraAndAlert() {
  const jiraDomain = "https://twoja-domena.atlassian.net"; 
  const jqlQuery = "priority=Highest AND status='To Do'";
  const jiraUrl = `${jiraDomain}/rest/api/3/search?jql=${encodeURIComponent(jqlQuery)}`;

  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_TOKEN;

  if (!email || !token) {
    console.error("Error: Jira credentials missing in .env file.");
    return;
  }

  const authHeader = "Basic " + btoa(`${email}:${token}`);

  try {
    console.log("[Jira] Fetching critical issues...");
    const response = await fetch(jiraUrl, {
      method: "GET",
      headers: {
        "Authorization": authHeader,
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`Jira API responded with status ${response.status}`);
    }

    const data = await response.json();

    if (!data.issues || data.issues.length === 0) {
      console.log("[Jira] No high-priority bottlenecks found. System clear.");
      return;
    }

    console.log(`[Jira] Found ${data.issues.length} issues. Processing alerts...`);

    // 3. Pętla przechodząca przez znalezione błędy
    for (const issue of data.issues) {
      const key = issue.key;
      const summary = issue.fields.summary;
      
      await sendSlackAlert(key, summary);
    }

  } catch (error) {
    console.error("[System Error] Critical breakdown during runtime:", error.message);
  }
}

// Uruchomienie aplikacji
checkJiraAndAlert();
