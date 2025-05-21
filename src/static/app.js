document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Função utilitária para mostrar o modal de confirmação customizado
  function showConfirmModal(message) {
    return new Promise((resolve) => {
      const modal = document.getElementById('confirm-modal');
      const msg = document.getElementById('confirm-modal-message');
      const yesBtn = document.getElementById('confirm-modal-yes');
      const noBtn = document.getElementById('confirm-modal-no');
      msg.textContent = message;
      modal.classList.remove('hidden');

      function cleanup(result) {
        modal.classList.add('hidden');
        yesBtn.removeEventListener('click', onYes);
        noBtn.removeEventListener('click', onNo);
        resolve(result);
      }
      function onYes() { cleanup(true); }
      function onNo() { cleanup(false); }

      yesBtn.addEventListener('click', onYes);
      noBtn.addEventListener('click', onNo);
    });
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Render activities with participants
      renderActivities(activities);

      // Populate activity select dropdown
      Object.keys(activities).forEach((name) => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Function to render activities with participants
  function renderActivities(activities) {
    activitiesList.innerHTML = "";
    Object.entries(activities).forEach(([name, data]) => {
      const card = document.createElement("div");
      card.className = "activity-card";
      card.innerHTML = `
        <h4>${name}</h4>
        <p>${data.description}</p>
        <p><strong>Schedule:</strong> ${data.schedule}</p>
        <p><strong>Max participants:</strong> ${data.max_participants}</p>
        <div class="participants-section">
          <h5>Participants</h5>
          <ul class="participants-list">
            ${
              data.participants.length === 0
                ? '<li><em>No participants yet</em></li>'
                : data.participants.map(email => `
                  <li>
                    <span>${email}</span>
                    <button class="delete-participant-btn" data-activity="${encodeURIComponent(name)}" data-email="${encodeURIComponent(email)}" title="Remover participante">&times;</button>
                  </li>
                `).join('')
            }
          </ul>
        </div>
      `;
      activitiesList.appendChild(card);
    });

    // Add events to delete buttons
    document.querySelectorAll('.delete-participant-btn').forEach(btn => {
      btn.addEventListener('click', async function(e) {
        const activity = decodeURIComponent(this.getAttribute('data-activity'));
        const email = decodeURIComponent(this.getAttribute('data-email'));
        const confirmed = await showConfirmModal(`Remover ${email} de "${activity}"?`);
        if (confirmed) {
          fetch(`/activities/${encodeURIComponent(activity)}/remove`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
          })
          .then(res => {
            if (!res.ok) throw new Error('Erro ao remover participante');
            return res.json();
          })
          .then(() => fetch('/activities'))
          .then(res => res.json())
          .then(renderActivities)
          .catch(() => alert('Não foi possível remover o participante.'));
        }
      });
    });
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Refresh activities list
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
