// Dashboard.js - Frontend controller for Job Search Agent UI

document.addEventListener('DOMContentLoaded', () => {
  const statScanned = document.getElementById('statScanned');
  const statApplied = document.getElementById('statApplied');
  const statNextRun = document.getElementById('statNextRun');
  const logConsole = document.getElementById('logConsole');
  const appliedJobsList = document.getElementById('appliedJobsList');
  const portalsContainer = document.getElementById('portalsContainer');
  const btnRunNow = document.getElementById('btnRunNow');
  const btnClearLogs = document.getElementById('btnClearLogs');
  
  // Navigation elements
  const navItems = document.querySelectorAll('.nav-item');
  const viewPanels = document.querySelectorAll('.view-panel');
  const viewTitle = document.getElementById('viewTitle');

  // Config / Profile form elements
  const selectPortal = document.getElementById('selectPortal');
  const inputUsername = document.getElementById('inputUsername');
  const inputPassword = document.getElementById('inputPassword');
  const inputDailyLimit = document.getElementById('inputDailyLimit');
  const portalConfigForm = document.getElementById('portalConfigForm');

  const profileForm = document.getElementById('profileForm');
  const profFirstName = document.getElementById('profFirstName');
  const profLastName = document.getElementById('profLastName');
  const profEmail = document.getElementById('profEmail');
  const profPhone = document.getElementById('profPhone');
  const profLocation = document.getElementById('profLocation');
  const profExpectedCTC = document.getElementById('profExpectedCTC');
  const profNoticePeriod = document.getElementById('profNoticePeriod');
  const profKeywords = document.getElementById('profKeywords');
  
  const coverLetterForm = document.getElementById('coverLetterForm');
  const coverLetterTextarea = document.getElementById('coverLetterTextarea');

  let fullConfig = null;

  // 1. Tab switching navigation logic
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Toggle nav item classes
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');

      // Toggle views visibility
      const targetId = item.getAttribute('data-target');
      viewPanels.forEach(panel => panel.classList.add('d-none'));
      document.getElementById(targetId).classList.remove('d-none');

      // Update Header Text
      viewTitle.textContent = item.textContent.trim() + " Panel";
    });
  });

  // 2. Fetch current status and logs
  async function fetchStatus() {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();

      statScanned.textContent = data.stats.jobsScanned || 0;
      statApplied.textContent = data.stats.applicationsSubmitted || 0;
      statNextRun.textContent = data.nextRunTime || 'In 2 Hours';

      const statEmailsSent = document.getElementById('statEmailsSent');
      const statConnectionsSent = document.getElementById('statConnectionsSent');
      const badgeEmailsTotal = document.getElementById('badgeEmailsTotal');
      const badgeConnTotal = document.getElementById('badgeConnTotal');
      const emailedLeadsList = document.getElementById('emailedLeadsList');
      const connectionRequestsList = document.getElementById('connectionRequestsList');

      if (data.outreachStats) {
        if (statEmailsSent) statEmailsSent.textContent = data.outreachStats.emailsSentTotal || 0;
        if (statConnectionsSent) statConnectionsSent.textContent = data.outreachStats.connectionsSentTotal || 0;
        if (badgeEmailsTotal) badgeEmailsTotal.textContent = `${data.outreachStats.emailsSentTotal || 0} Sent`;
        if (badgeConnTotal) badgeConnTotal.textContent = `${data.outreachStats.connectionsSentTotal || 0} Sent`;

        // Render emailed recruiter leads table
        if (emailedLeadsList && data.outreachStats.emailedLeadsList && data.outreachStats.emailedLeadsList.length > 0) {
          emailedLeadsList.innerHTML = data.outreachStats.emailedLeadsList.slice().reverse().map(item => `
            <tr>
              <td style="font-weight: 600; color: #10b981;">${item.email}</td>
              <td>${item.company || 'N/A'}</td>
              <td>${item.title || 'N/A'}</td>
              <td><span style="background: rgba(16,185,129,0.15); color: #10b981; padding: 3px 8px; border-radius: 6px; font-weight: 600;">Dispatched (CV Attached)</span></td>
              <td>${new Date(item.dispatchedAt).toLocaleString()}</td>
            </tr>
          `).join('');
        }

        // Render LinkedIn connection requests table
        if (connectionRequestsList && data.outreachStats.connectionsList && data.outreachStats.connectionsList.length > 0) {
          connectionRequestsList.innerHTML = data.outreachStats.connectionsList.slice().reverse().map(item => `
            <tr>
              <td style="font-weight: 600; color: #3b82f6;">${item.name || 'Hiring Lead'}</td>
              <td>${item.title || item.headline || 'N/A'} ${item.company ? '@ ' + item.company : ''}</td>
              <td><a href="${item.profileUrl}" target="_blank" style="color: #60a5fa; text-decoration: underline;">Profile Link</a></td>
              <td style="font-size: 12px; max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.note || 'Standard Pitch'}</td>
              <td><span style="background: rgba(59,130,246,0.15); color: #3b82f6; padding: 3px 8px; border-radius: 6px; font-weight: 600;">SENT</span></td>
            </tr>
          `).join('');
        }
      }

      // Update applied list
      if (data.stats.appliedRolesList && data.stats.appliedRolesList.length > 0) {
        appliedJobsList.innerHTML = data.stats.appliedRolesList.slice().reverse().map(role => `
          <tr>
            <td style="font-weight: 600;">${role.title}</td>
            <td>${role.company}</td>
            <td style="text-transform: capitalize;">${role.portal}</td>
            <td><span class="badge-status-completed">Submitted</span></td>
            <td>${new Date(role.time).toLocaleTimeString()}</td>
          </tr>
        `).join('');
      } else {
        appliedJobsList.innerHTML = `<tr><td colspan="5" class="empty-state">No submissions recorded today yet.</td></tr>`;
      }
    } catch (e) {
      console.error('Error fetching stats:', e);
    }
  }

  // 3. Fetch and render logs
  async function fetchLogs() {
    try {
      const res = await fetch('/api/logs');
      const content = await res.text();
      logConsole.textContent = content;
      
      // Auto scroll terminal to bottom if looking at logs
      const terminal = document.querySelector('.terminal-window');
      if (terminal) {
        terminal.scrollTop = terminal.scrollHeight;
      }
    } catch (e) {
      console.error('Error fetching logs:', e);
    }
  }

  // 4. Fetch configs and portal list
  async function fetchConfig() {
    try {
      const res = await fetch('/api/config');
      fullConfig = await res.json();
      
      const portals = fullConfig.config.platforms;
      const sortedPortals = Object.keys(portals).sort((a, b) => {
        return (portals[a].priority || 99) - (portals[b].priority || 99);
      });

      portalsContainer.innerHTML = sortedPortals.map(key => {
        const portal = portals[key];
        const statusClass = portal.enabled ? 'badge-active' : 'badge-disabled';
        const statusText = portal.enabled ? 'Active' : 'Disabled';
        const limitText = portal.max_applications_per_day ? `${portal.max_applications_per_day}/day` : 'No Cap';
        
        return `
          <div class="portal-item">
            <div class="portal-info">
              <span class="portal-name">${key}</span>
              <span class="portal-prio">Priority: ${portal.priority || 'N/A'} • Limit: ${limitText}</span>
            </div>
            <span class="badge ${statusClass}">${statusText}</span>
          </div>
        `;
      }).join('');

      // Pre-fill profile settings inputs
      const profile = fullConfig.profile;
      profFirstName.value = profile.personal_info.first_name || '';
      profLastName.value = profile.personal_info.last_name || '';
      profEmail.value = profile.personal_info.email || '';
      profPhone.value = profile.personal_info.phone || '';
      profLocation.value = profile.personal_info.current_location || '';
      profExpectedCTC.value = profile.job_search_criteria.salary_expectation.expected || '';
      profNoticePeriod.value = profile.job_search_criteria.notice_period.days || '';
      profKeywords.value = profile.keywords ? profile.keywords.join(', ') : '';

      // Update current portal inputs selection
      updatePortalInputs();
    } catch (e) {
      console.error('Error fetching config:', e);
    }
  }

  // Load username and limit when portal select changes
  function updatePortalInputs() {
    if (!fullConfig) return;
    const activePortal = selectPortal.value;
    
    // Set daily limit
    const portalConfig = fullConfig.config.platforms[activePortal];
    inputDailyLimit.value = portalConfig ? (portalConfig.max_applications_per_day || '') : '';
    
    // Fetch username (calling API to fetch credentials stub)
    fetch('/api/credentials')
      .then(res => res.json())
      .then(creds => {
        const cred = creds[activePortal];
        inputUsername.value = cred ? cred.username : '';
        inputPassword.value = ''; // Don't prefill password
        inputPassword.placeholder = cred && cred.hasPassword ? '•••••••• (Saved)' : 'Enter Password';
      });
  }

  selectPortal.addEventListener('change', updatePortalInputs);

  // 5. Submit Portal Configurations
  portalConfigForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const portal = selectPortal.value;
    const username = inputUsername.value;
    const password = inputPassword.value;
    const dailyLimit = parseInt(inputDailyLimit.value);

    try {
      // Post credentials
      await fetch('/api/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portal, username, password })
      });

      // Update config platform limits
      if (fullConfig && fullConfig.config.platforms[portal]) {
        fullConfig.config.platforms[portal].max_applications_per_day = dailyLimit || null;
        await fetch('/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config: fullConfig.config })
        });
      }

      alert(`Settings successfully saved for ${portal}!`);
      fetchConfig();
    } catch (e) {
      alert(`Failed to save portal settings: ${e.message}`);
    }
  });

  // 6. Submit Profile Configurations
  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!fullConfig) return;

    // Update local profile object
    const profile = fullConfig.profile;
    profile.personal_info.first_name = profFirstName.value;
    profile.personal_info.last_name = profLastName.value;
    profile.personal_info.email = profEmail.value;
    profile.personal_info.phone = profPhone.value;
    profile.personal_info.current_location = profLocation.value;
    profile.job_search_criteria.salary_expectation.expected = parseInt(profExpectedCTC.value) || 0;
    profile.job_search_criteria.notice_period.days = parseInt(profNoticePeriod.value) || 0;
    profile.keywords = profKeywords.value.split(',').map(k => k.trim()).filter(k => k);

    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile })
      });
      alert('Profile configurations updated successfully!');
      fetchConfig();
    } catch (e) {
      alert(`Failed to save profile: ${e.message}`);
    }
  });

  // 7. Trigger cycle run now
  btnRunNow.addEventListener('click', async () => {
    btnRunNow.disabled = true;
    btnRunNow.innerHTML = `<span class="btn-icon">🔄</span> Executing applications...`;
    logConsole.textContent += '\n\n[System] Spawning immediate job search cycle process...\n';

    try {
      const res = await fetch('/api/run-now', { method: 'POST' });
      const result = await res.json();
      
      if (result.error) {
        logConsole.textContent += `\n[System Error] Run execution failed: ${result.error}\n`;
      } else {
        logConsole.textContent += `\n[System Success] Immediate run completed successfully!\n`;
      }
      
      // Refresh statistics & logs
      await fetchStatus();
      await fetchLogs();
    } catch (e) {
      logConsole.textContent += `\n[System Error] Network connection failed: ${e.message}\n`;
    } finally {
      btnRunNow.disabled = false;
      btnRunNow.innerHTML = `<span class="btn-icon">⚡</span> Run Cycle Now`;
    }
  });

  // 7b. Trigger Boolean Discovery run
  const btnRunBoolean = document.getElementById('btnRunBoolean');
  if (btnRunBoolean) {
    btnRunBoolean.addEventListener('click', async () => {
      btnRunBoolean.disabled = true;
      btnRunBoolean.innerHTML = `<span class="btn-icon">⌛</span> Discovering...`;
      logConsole.textContent += `\n[${new Date().toLocaleTimeString()}] 🔍 Manual Boolean Lead Discovery & Scraping cycle initiated from UI...\n`;

      try {
        const res = await fetch('/api/run-boolean-discovery', { method: 'POST' });
        const data = await res.json();
        
        if (data.output) {
          logConsole.textContent += `\n=== Boolean Lead Discovery Results ===\n${data.output}\n`;
        }
        if (data.error) {
          logConsole.textContent += `\n[Discovery Error] ${data.error}\n`;
        }

        await fetchStatus();
        await fetchLogs();
      } catch (e) {
        logConsole.textContent += `\n[Discovery Network Error] ${e.message}\n`;
      } finally {
        btnRunBoolean.disabled = false;
        btnRunBoolean.innerHTML = `<span class="btn-icon">🔍</span> Run Boolean Discovery`;
      }
    });
  }

  // 8. Clear console output
  btnClearLogs.addEventListener('click', () => {
    logConsole.textContent = '';
  });

  // 9. Fetch and Save Cover Letter
  async function fetchCoverLetter() {
    try {
      const res = await fetch('/api/cover-letter');
      const data = await res.json();
      coverLetterTextarea.value = data.content || '';
    } catch (e) {
      console.error('Error fetching cover letter:', e);
    }
  }

  coverLetterForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await fetch('/api/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: coverLetterTextarea.value })
      });
      alert('Cover letter template saved successfully!');
    } catch (e) {
      alert(`Failed to save cover letter: ${e.message}`);
    }
  });

  // Initialization & polling
  fetchStatus();
  fetchLogs();
  fetchConfig();
  fetchCoverLetter();

  setInterval(fetchStatus, 4000);
  setInterval(fetchLogs, 4000);
});
