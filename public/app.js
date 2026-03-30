// --- Déconnexion admin + affichage conditionnel du bouton ---
// Variable globale pour la sélection des moments de la journée dans le calendrier custom
let selectedMomentsState = [];
document.addEventListener('DOMContentLoaded', function() {
  // Masquer le panneau admin si pas de session
  var panel = document.getElementById('admin-panel');
  var loginWrap = document.getElementById('admin-login-wrap');
  var adminSession = localStorage.getItem('chiino_admin_session_v1');
  if (panel && loginWrap) {
    if (!adminSession) {
      panel.style.display = 'none';
      loginWrap.style.display = '';
    } else {
      panel.style.display = '';
      loginWrap.style.display = 'none';
    }
  }

  var logoutBtn = document.getElementById('admin-logout-btn');
  var logoutWrap = document.getElementById('admin-logout-wrap');
  var loginWrap = document.getElementById('admin-login-wrap');
  var adminHome = document.getElementById('admin-home');

  function updateLogoutBtnVisibility() {
    if (logoutWrap && adminHome) {
      // Affiche le bouton uniquement si la page d'accueil admin est visible
      const isHomeVisible = adminHome.offsetParent !== null;
      logoutWrap.style.display = isHomeVisible ? 'flex' : 'none';
    }
  }

  // Observer les changements de visibilité de la page d'accueil admin
  if (adminHome) {
    const observer = new MutationObserver(updateLogoutBtnVisibility);
    observer.observe(adminHome, { attributes: true, attributeFilter: ['style', 'class'] });
    updateLogoutBtnVisibility();
  }

  // Affiche le bouton de déconnexion dès la connexion réussie
  var loginBtn = document.getElementById('admin-login-btn');
  if (loginBtn && logoutWrap && adminHome) {
    loginBtn.addEventListener('click', function() {
      setTimeout(function() {
        // Si la page d'accueil admin est visible après connexion, afficher le bouton
        if (adminHome.offsetParent !== null) {
          logoutWrap.style.display = 'flex';
        }
      }, 300);
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
      // Suppression du token/session admin (clé locale)
      localStorage.removeItem('chiino_admin_session_v1');
      localStorage.removeItem('chiino_admin_password_v1');
      // Affiche le formulaire de connexion et masque le panneau admin
      if (loginWrap) loginWrap.style.display = '';
      if (panel) panel.style.display = 'none';
      if (logoutWrap) logoutWrap.style.display = 'none';
      // Optionnel : reset du champ mot de passe
      var pwd = document.getElementById('admin-password');
      if (pwd) pwd.value = '';
      // Scroll en haut pour UX
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
});
// --- Redirection sur clic des produits best-sellers vers la boutique ---
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.home-best-card').forEach(function(card) {
    card.style.cursor = 'pointer';
    card.addEventListener('click', function(e) {
      // Évite double navigation si bouton "Voir" cliqué
      if (e.target.closest('button')) return;
      window.location.href = 'boutique.html';
    });
  });
});
// --- Redirection sur clic du badge "prochain créneau" ---
document.addEventListener('DOMContentLoaded', function() {
  var badge = document.querySelector('.hero-badge');
  if (badge) {
    badge.style.cursor = 'pointer';
    badge.title = 'Voir les créneaux de réservation';
    badge.addEventListener('click', function() {
      window.location.href = 'reservation.html';
    });
  }
});
// --- Restriction des jours de réservation selon la config admin ---
// --- Gestion calendrier mensuel de disponibilités admin ---
const AVAILABLE_DATES_KEY = 'chiino_available_dates_v1';
let availableDatesState = [];

function getCurrentMonthYear() {
  const now = new Date();
  return { month: now.getMonth(), year: now.getFullYear() };
}

function renderAdminAvailableCalendar() {
  const calendarDiv = document.getElementById('admin-available-calendar');
  if (!calendarDiv) return;

  // Stocker le mois/année courant dans le DOM pour navigation
  if (!calendarDiv.dataset.month || !calendarDiv.dataset.year) {
    // Si aujourd'hui, on affiche le mois du lendemain par défaut
    const now = new Date();
    let month = now.getMonth();
    let year = now.getFullYear();
    // Si on est le dernier jour du mois, passer au mois suivant
    if (now.getDate() === new Date(year, month + 1, 0).getDate()) {
      month++;
      if (month > 11) {
        month = 0;
        year++;
      }
    }
    calendarDiv.dataset.month = month;
    calendarDiv.dataset.year = year;
  }
  let month = parseInt(calendarDiv.dataset.month, 10);
  let year = parseInt(calendarDiv.dataset.year, 10);

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const monthNames = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  let html = `<div style="display:flex;align-items:center;justify-content:center;margin-bottom:8px;gap:12px">
    <button id="admin-cal-prev" style="background:none;border:none;color:var(--accent);font-size:18px;cursor:pointer">&#8592;</button>
    <span style="font-weight:bold;font-size:15px">${monthNames[month]} ${year}</span>
    <button id="admin-cal-next" style="background:none;border:none;color:var(--accent);font-size:18px;cursor:pointer">&#8594;</button>
  </div>`;
  html += '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;text-align:center">';
  const weekDays = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
  weekDays.forEach(d => html += `<div style='font-weight:bold'>${d}</div>`);
  let start = firstDay.getDay();
  start = start === 0 ? 6 : start - 1; // Lundi=0
  for (let i = 0; i < start; i++) html += '<div></div>';
  const today = new Date();
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month, d);
    const dateKey = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const checked = availableDatesState.includes(dateKey);
    // Désactiver les jours <= aujourd'hui + 2
    let disabled = false;
    // Calculer la date limite (aujourd'hui + 2 jours)
    const limitDate = new Date(today);
    limitDate.setDate(today.getDate() + 2);
    if (
      dateObj <= limitDate
    ) {
      disabled = true;
    }
    // Style carré bleu sélectionnable
    let style = `display:flex;align-items:center;justify-content:center;width:32px;height:32px;margin:2px auto;border-radius:7px;font-weight:bold;font-size:15px;cursor:pointer;user-select:none;`;
    if (disabled) {
      style += 'background:#e0e0e0;color:#aaa;cursor:not-allowed;';
    } else if (checked) {
      style += 'background:#2196f3;color:#fff;box-shadow:0 0 0 2px #1976d2;';
    } else {
      style += 'background:#e3f2fd;color:#1976d2;';
    }
    html += `<div class='admin-available-day' data-date='${dateKey}' data-disabled='${disabled}' style='${style}'>${d}</div>`;
  }
  html += '</div>';
  calendarDiv.innerHTML = html;

  // Navigation mois précédent/suivant
  document.getElementById('admin-cal-prev').onclick = function() {
    month--;
    if (month < 0) { month = 11; year--; }
    calendarDiv.dataset.month = month;
    calendarDiv.dataset.year = year;
    renderAdminAvailableCalendar();
  };
  document.getElementById('admin-cal-next').onclick = function() {
    month++;
    if (month > 11) { month = 0; year++; }
    calendarDiv.dataset.month = month;
    calendarDiv.dataset.year = year;
    renderAdminAvailableCalendar();
  };
}

function bindAdminAvailableCalendar() {
  renderAdminAvailableCalendar();
  const calendarDiv = document.getElementById('admin-available-calendar');
  if (!calendarDiv) return;
  calendarDiv.addEventListener('click', function(e) {
    const dayDiv = e.target.closest('.admin-available-day');
    if (!dayDiv) return;
    const date = dayDiv.dataset.date;
    const disabled = dayDiv.dataset.disabled === 'true';
    if (disabled) return;
    const idx = availableDatesState.indexOf(date);
    if (idx === -1) {
      availableDatesState.push(date);
      dayDiv.style.background = '#2196f3';
      dayDiv.style.color = '#fff';
      dayDiv.style.boxShadow = '0 0 0 2px #1976d2';
    } else {
      availableDatesState.splice(idx, 1);
      dayDiv.style.background = '#e3f2fd';
      dayDiv.style.color = '#1976d2';
      dayDiv.style.boxShadow = '';
    }
    // Sauvegarder la sélection dans le localStorage
    writeJsonStorage(AVAILABLE_DATES_KEY, availableDatesState);
  });
}

// Nouvelle version : ne sont valides que les jours cochés dans le calendrier admin (AVAILABLE_DATES_KEY)
function isDayAvailableForReservation(date) {
  // date : objet Date
  const availableDates = readJsonStorage(AVAILABLE_DATES_KEY, []);
  const key = date.toISOString().slice(0,10);
  return availableDates.includes(key);
}

function updateReservationDayInput() {
  const dayInput = document.getElementById('reservation-day');
  if (!dayInput) return;
  // Empêche la sélection de jours non disponibles
  dayInput.addEventListener('input', function() {
    const val = dayInput.value;
    if (!val) return;
    const d = new Date(val + 'T00:00:00');
    if (!isDayAvailableForReservation(d)) {
      dayInput.setCustomValidity('Ce jour n\'est pas disponible.');
      dayInput.reportValidity();
    } else {
      dayInput.setCustomValidity('');
    }
  });

  // Empêche la sélection via le calendrier natif (pour UX, mais contournable)
  dayInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' || e.key === 'Tab') {
      const val = dayInput.value;
      if (val) {
        const d = new Date(val + 'T00:00:00');
        if (!isDayAvailableForReservation(d)) {
          dayInput.setCustomValidity('Ce jour n\'est pas disponible.');
          dayInput.reportValidity();
        } else {
          dayInput.setCustomValidity('');
        }
      }
    }
  });

  // Optionnel : afficher un message ou désactiver les jours non valides (si on veut aller plus loin, il faut un datepicker custom)
}

if (window.location.pathname.endsWith('reservation.html')) {
  document.addEventListener('DOMContentLoaded', function() {
    // Désactive le champ natif, affiche le calendrier custom
    const dayInput = document.getElementById('reservation-day');
    const momentInput = document.getElementById('reservation-moment-visible');
    const popup = document.getElementById('custom-calendar-popup');
    const calContainer = document.getElementById('custom-calendar-container');
    if (!dayInput || !popup || !calContainer) return;

    // Permet d'ouvrir le calendrier aussi en cliquant sur le champ moment de la journée
    if (momentInput) {
      momentInput.addEventListener('click', function(e) {
        e.preventDefault();
        // Reset les moments sélectionnés à chaque ouverture
        selectedMomentsState = [];
        const formMomentInput = document.getElementById('reservation-moment');
        if (formMomentInput) formMomentInput.value = '';
        const formMomentVisible = document.getElementById('reservation-moment-visible');
        if (formMomentVisible) formMomentVisible.value = '';
        popup.style.display = 'flex';
        renderCustomCalendar(dayInput.value);
      });
    }

    function renderCustomCalendar(selectedDateStr) {
      // Récupère les jours disponibles
      const availableDates = readJsonStorage(AVAILABLE_DATES_KEY, []);
      // Mois/année affichés (par défaut, mois du lendemain ou du jour si aucun selected)
      let month, year;
      // Ne jamais pré-sélectionner de date
      // On ignore selectedDateStr pour la sélection visuelle
      if (selectedDateStr && selectedDateStr !== '') {
        const d = new Date(selectedDateStr);
        month = d.getMonth();
        year = d.getFullYear();
      } else {
        const now = new Date();
        month = now.getMonth();
        year = now.getFullYear();
        if (now.getDate() === new Date(year, month + 1, 0).getDate()) {
          month++;
          if (month > 11) { month = 0; year++; }
        }
      }
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();
      const monthNames = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
      let html = `<div style=\"background:var(--noir);border-radius:16px;padding:24px 18px;box-shadow:0 4px 24px #0004;width:430px;min-width:430px;max-width:430px;min-height:420px;height:420px;margin:0 auto;display:flex;flex-direction:column;justify-content:flex-start;\">`;
      html += `<div class=\"custom-cal-month\" style=\"display:flex;align-items:center;justify-content:center;margin-bottom:12px;gap:18px;white-space:nowrap;width:370px;max-width:370px;min-width:370px;\">\n        <button id=\"custom-cal-prev\" style=\"background:none;border:none;color:#fff;font-size:28px;font-weight:bold;cursor:pointer;padding:0 8px;flex:0 0 48px;\">&#8592;</button>\n        <span class=\"custom-cal-month-label\" style=\"font-weight:900;font-size:22px;color:#fff;letter-spacing:1px;white-space:nowrap;flex:1;text-align:center;\">${monthNames[month]} ${year}</span>\n        <button id=\"custom-cal-next\" style=\"background:none;border:none;color:#fff;font-size:28px;font-weight:bold;cursor:pointer;padding:0 8px;flex:0 0 48px;\">&#8594;</button>\n      </div>`;
      html += '<div class=\"custom-cal-weekdays\" style=\"display:grid;grid-template-columns:repeat(7,1fr);gap:4px;text-align:center;margin-bottom:8px;\">';
      const weekDays = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
      weekDays.forEach(d => html += `<div class='custom-cal-weekday' style='font-weight:700;font-size:15px;color:var(--accent);background:var(--bleu2);border-radius:5px;padding:2px 0;'>${d}</div>`);
      let start = firstDay.getDay();
      start = start === 0 ? 6 : start - 1;
      for (let i = 0; i < start; i++) html += '<div></div>';
      const today = new Date();
      // Calcul de la date min réservable (aujourd'hui + 2 jours)
      const minDate = new Date(today);
      minDate.setDate(minDate.getDate() + 2);
      minDate.setHours(0,0,0,0);
      // Stocker la première date sélectionnée
      if (!window.firstSelectedReservationDate) {
        window.firstSelectedReservationDate = dayInput.value || '';
      }
      for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(year, month, d);
        const dateKey = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const isAvailable = availableDates.includes(dateKey);
        let disabled = false;
        if (dateObj <= minDate) {
          disabled = true;
        }
        let style = `display:flex;align-items:center;justify-content:center;width:38px;height:38px;margin:3px auto;border-radius:9px;font-weight:900;font-size:17px;cursor:pointer;user-select:none;transition:background 0.15s,color 0.15s,box-shadow 0.15s;box-shadow:0 1px 4px #0004;`;
        const isToday = dateObj.getFullYear() === today.getFullYear() && dateObj.getMonth() === today.getMonth() && dateObj.getDate() === today.getDate();
        // Correction : la sélection dépend de dayInput.value
        const isSelected = dayInput && dayInput.value === dateKey;
        if (disabled || !isAvailable) {
          style += 'background:var(--bleu2);color:var(--muted);cursor:not-allowed;opacity:0.6;';
        } else if (isSelected) {
          style += 'background:var(--bleu);color:#fff;border:2.5px solid var(--accent);';
        } else {
          style += 'background:var(--bleu);color:#fff;border:none;';
        }
        if (isToday) {
          style += 'outline:2.5px solid #ff9800;outline-offset:2px;';
        }
        html += `<div class='custom-cal-day' data-date='${dateKey}' data-disabled='${disabled || !isAvailable}' style='${style}'>${d}</div>`;
      }
      html += '</div></div>';
      // Réduit l'espace entre la grille des dates et le moment de la journée
      html += '<div style="height:10px;"></div>';
      // Ajout du choix du moment de la journée
      const moments = [
        { value: 'matin', label: 'Matin', icon: '☀️' },
        { value: 'apres-midi', label: 'Après-midi', icon: '🌤️' },
        { value: 'soiree', label: 'Soirée', icon: '🌙' }
      ];
      html += `<div style='margin:14px 0 0 0;text-align:center;'>
        <div style="font-family:'Syne',sans-serif;font-weight:800;color:var(--accent);font-size:15px;margin-bottom:7px;">Moment de la journée</div>
        <div id='custom-cal-moment-group' style='display:flex;justify-content:center;gap:12px;'>
          ${moments.map(m => `
            <button type='button' class='moment-btn${selectedMomentsState.includes(m.value) ? ' selected' : ''}' data-moment='${m.value}' style="background:${selectedMomentsState.includes(m.value) ? 'var(--accent)' : 'var(--bleu)'};border:2px solid ${selectedMomentsState.includes(m.value) ? '#fff' : 'var(--accent)'};border-radius:8px;padding:10px 16px;font-size:16px;color:#fff;cursor:pointer;transition:all 0.15s;display:flex;flex-direction:column;align-items:center;gap:2px;font-family:'Syne',sans-serif;font-weight:700;">
              <span style='font-size:22px;line-height:1;'>${m.icon}</span>
              <span>${m.label}</span>
            </button>
          `).join('')}
        </div>
        <input type='hidden' id='custom-cal-moment' value=''>
        <div style='display:flex;justify-content:space-between;margin-top:14px;'>
          <button id='calendar-validate-btn' style='background:var(--accent);color:#fff;border:none;border-radius:7px;padding:8px 18px;font-size:16px;font-weight:bold;cursor:pointer;'>Valider</button>
          <button id='custom-cal-close' style='background:none;border:none;color:var(--accent);font-weight:bold;font-size:15px;cursor:pointer'>Annuler</button>
        </div>
      </div>`;
      calContainer.innerHTML = html;
      // Appliquer la police Syne aux jours et aux mois
      setTimeout(() => {
        calContainer.querySelectorAll('.custom-cal-day').forEach(el => {
          el.style.fontFamily = "'Syne',sans-serif";
        });
        // Appliquer aussi aux noms de jours et mois
        calContainer.querySelectorAll('button, .custom-cal-month, .custom-cal-weekdays > div').forEach(el => {
          el.style.fontFamily = "'Syne',sans-serif";
        });
      }, 0);

      // Appliquer le fond noir au container du calendrier
      calContainer.style.background = 'var(--noir)';
      calContainer.style.color = 'var(--paper)';
      const validateBtn = document.getElementById('calendar-validate-btn');
      if (validateBtn) {
        validateBtn.onclick = function() {
          const selectedDate = dayInput.value?.trim() || '';
          // Récupérer les moments sélectionnés (tableau)
          const selectedMoments = Array.from(document.querySelectorAll('.moment-btn.selected')).map(btn => btn.dataset.moment);
          if (!selectedDate && selectedMoments.length < 1) {
            alert('Merci de choisir une date et au moins 1 moment de la journée.');
            return;
          }
          if (!selectedDate) {
            alert('Merci de choisir une date.');
            return;
          }
          if (selectedMoments.length < 1) {
            alert('Merci de sélectionner au moins 1 moment de la journée.');
            return;
          }
          if (selectedMoments.length > 3) {
            alert('Vous pouvez sélectionner au maximum 3 moments de la journée.');
            return;
          }
          // Si tout est ok, remplir le champ caché du formulaire (valeurs séparées par virgule)
          const formMomentInput = document.getElementById('reservation-moment');
          if (formMomentInput) formMomentInput.value = selectedMoments.join(',');
                    // Mettre à jour le champ visible
                    const formMomentVisible = document.getElementById('reservation-moment-visible');
                    if (formMomentVisible) formMomentVisible.value = selectedMoments.map(m => {
                      if (m === 'matin') return 'Matin';
                      if (m === 'apres-midi') return 'Après-midi';
                      if (m === 'soiree') return 'Soirée';
                      return m;
                    }).join(', ');
          popup.style.display = 'none';
          dayInput.dispatchEvent(new Event('input'));
        };
      }

      // Navigation
      document.getElementById('custom-cal-prev').onclick = function() {
        month--;
        if (month < 0) { month = 11; year--; }
        renderCustomCalendar(`${year}-${String(month+1).padStart(2,'0')}-01`);
      };
      document.getElementById('custom-cal-next').onclick = function() {
        month++;
        if (month > 11) { month = 0; year++; }
        renderCustomCalendar(`${year}-${String(month+1).padStart(2,'0')}-01`);
      };
      document.getElementById('custom-cal-close').onclick = function() {
        popup.style.display = 'none';
      };
      // Sélection jour
      calContainer.querySelectorAll('.custom-cal-day').forEach(function(dayDiv) {
        // Met à jour l'affichage de la sélection en temps réel
        function updateSelectionFeedback() {
          const feedback = document.getElementById('custom-cal-selection-feedback');
          if (!feedback) return;
          const moments = Array.from(calContainer.querySelectorAll('.moment-btn.selected')).map(b => b.textContent.trim()).join(', ');
          let txt = '';
          if (moments) txt += `<b>Moment :</b> ${moments}`;
          feedback.innerHTML = txt;
        }
        // Initialiser l'affichage à l'ouverture
        updateSelectionFeedback();
        if (dayDiv.dataset.disabled === 'true') return;
        dayDiv.onclick = function() {
          // Désélection si déjà sélectionnée
          if (dayInput.value === dayDiv.dataset.date) {
            setDateFromCalendar('');
          } else {
            setDateFromCalendar(dayDiv.dataset.date);
          }
          // Forcer le rerender pour garantir la cohérence visuelle, mais rester sur le même mois
          const currentMonth = month;
          const currentYear = year;
          renderCustomCalendar(`${currentYear}-${String(currentMonth+1).padStart(2,'0')}-01`);
          updateSelectionFeedback();
        };
      });
      // Gestion sélection multiple des moments
      const momentBtns = calContainer.querySelectorAll('.moment-btn');
      const momentInput = calContainer.querySelector('#custom-cal-moment');
      momentBtns.forEach(btn => {
        // Style initial : fond bleu foncé
        btn.style.background = 'var(--bleu)';
        btn.style.borderColor = 'var(--accent)';
        btn.onclick = function(e) {
          e.preventDefault();
          const isSelected = btn.classList.contains('selected');
          let selectedBtns = Array.from(momentBtns).filter(b => b.classList.contains('selected'));
          if (!isSelected && selectedBtns.length >= 3) {
            alert('Vous pouvez sélectionner au maximum 3 moments de la journée.');
            return;
          }
          btn.classList.toggle('selected');
          // Appliquer l'indice visuel JS (pour garantir la synchro)
          if (btn.classList.contains('selected')) {
            btn.style.background = 'var(--accent)';
            btn.style.borderColor = '#fff';
          } else {
            btn.style.background = 'var(--bleu)';
            btn.style.borderColor = 'var(--accent)';
          }
          selectedBtns = Array.from(momentBtns).filter(b => b.classList.contains('selected'));
          // Mettre à jour le champ caché avec la liste des moments sélectionnés
          const selectedMoments = selectedBtns.map(b => b.dataset.moment);
          if (momentInput) momentInput.value = selectedMoments.join(',');
          // Mettre à jour l'état global pour conserver la sélection au rerender
          selectedMomentsState = selectedMoments;
          updateSelectionFeedback();
        };
      });
    }

    dayInput.addEventListener('focus', function() {
      popup.style.display = 'flex';
      renderCustomCalendar('');
    });
      dayInput.addEventListener('click', function(e) {
        e.preventDefault();
        // Reset les moments sélectionnés à chaque ouverture
        selectedMomentsState = [];
        const formMomentInput = document.getElementById('reservation-moment');
        if (formMomentInput) formMomentInput.value = '';
        const formMomentVisible = document.getElementById('reservation-moment-visible');
        if (formMomentVisible) formMomentVisible.value = '';
        popup.style.display = 'flex';
        renderCustomCalendar(dayInput.value);
      });
    popup.addEventListener('mousedown', function(e) {
      if (e.target === popup) popup.style.display = 'none';
    });
    // Empêche la saisie manuelle
    dayInput.addEventListener('keydown', function(e) { e.preventDefault(); });
    dayInput.addEventListener('paste', function(e) { e.preventDefault(); });
    // Empêche la saisie manuelle, mais ne vide pas la valeur si elle vient du calendrier
    let lastSetByCalendar = false;
    dayInput.addEventListener('input', function(e) {
      if (!lastSetByCalendar) {
        dayInput.value = '';
      }
      lastSetByCalendar = false;
    });
    // Quand une date est sélectionnée via le calendrier, on marque le flag
    function setDateFromCalendar(dateStr) {
      lastSetByCalendar = true;
      dayInput.value = dateStr;
      // Ne pas fermer le popup ni déclencher l'input ici
    }
    // Remplacer la sélection jour pour utiliser la fonction ci-dessus
    function patchCalendarSelection() {
      // Ne rien faire ici : la logique de sélection est déjà gérée dans renderCustomCalendar
    }
    // Patcher la fonction de rendu calendrier pour utiliser la nouvelle sélection
    const origRenderCustomCalendar = renderCustomCalendar;
    renderCustomCalendar = function(selectedDateStr) {
      origRenderCustomCalendar(selectedDateStr);
      patchCalendarSelection();
    };
    updateReservationDayInput();
  });
}
// Export Excel (CSV simple) - doit être global pour le bouton

// Retourne la date minimum pour une réservation (aujourd'hui + 2 jours, format YYYY-MM-DD)
function getMinReservationDateKey() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  now.setDate(now.getDate() + 2);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
function exportOrdersToExcel() {
  const orders = Array.isArray(ordersState) ? ordersState : [];
  if (!orders.length) return;
  const headers = [
    'Référence', 'Date', 'Statut', 'Produits', 'Quantité', 'Prix unitaire (€)', 'Prix total (€)', 'Fournisseur', 'Statut expédition', 'Tracking'
  ];
  const rows = orders.map(order => {
    // On suppose que order.items est un tableau d'objets { label, quantity, unitPrice }
    let items = Array.isArray(order.items) ? order.items : [];
    if (!items.length && order.itemsLabel) {
      // fallback: 1 ligne avec itemsLabel
      items = [{ label: order.itemsLabel, quantity: order.quantity || 1, unitPrice: '' }];
    }
    // Si plusieurs produits, on fait une ligne par produit, sinon une seule ligne
    if (items.length) {
      return items.map(item => [
        order.orderRef || order.id || '',
        order.createdAt ? new Date(order.createdAt).toLocaleString('fr-FR') : '',
        order.status || '',
        item.label || '',
        item.quantity || 1,
        Number.isFinite(Number(item.unitPrice)) ? Number(item.unitPrice).toFixed(2).replace('.', ',') : '',
        Number.isFinite(Number(item.unitPrice)) && Number.isFinite(Number(item.quantity)) ? (Number(item.unitPrice) * Number(item.quantity)).toFixed(2).replace('.', ',') : '',
        order.supplierProvider || '',
        order.dispatchStatus || '',
        order.trackingNumber || ''
      ]);
    } else {
      // fallback si pas d'items détaillés
      return [
        order.orderRef || order.id || '',
        order.createdAt ? new Date(order.createdAt).toLocaleString('fr-FR') : '',
        order.status || '',
        order.itemsLabel || '',
        order.quantity || 1,
        '',
        '',
        order.supplierProvider || '',
        order.dispatchStatus || '',
        order.trackingNumber || ''
      ];
    }
  });
  // Ici, vous pouvez continuer le traitement pour générer le CSV à partir de headers et rows
}

function setFilt(el) {
  const container = el.closest('.filters, .shop-filters');
  if (!container) return;

  const norm = (value) => (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  const selected = norm(el.textContent);

  container.querySelectorAll('.filt').forEach(f => f.classList.remove('on'));
  el.classList.add('on');

  if (container.classList.contains('filters')) {
    document.querySelectorAll('.real-cell').forEach((card) => {
      const cardStyle = norm(card.querySelector('.cell-style')?.textContent);
      card.style.display = (selected === 'tous' || cardStyle === selected) ? '' : 'none';
    });
  }

  if (container.classList.contains('shop-filters')) {
    document.querySelectorAll('.product').forEach((card) => {
      const cardCategory = norm(card.dataset.category);
      card.style.display = (selected === 'tous' || cardCategory === selected) ? '' : 'none';
    });
  }
}

const initialActivePage = document.querySelector('.page.active');
if (initialActivePage && initialActivePage.id === 'page-boutique') {
  document.body.classList.add('is-boutique');
}

const lightbox = document.getElementById('lightbox');
const lightboxImage = document.getElementById('lightbox-image');
const lightboxClose = document.getElementById('lightbox-close');
let lastFocusedElement = null;

const CUSTOM_PRODUCTS_KEY = 'chiino_custom_products_v1';
const CUSTOM_REALS_KEY = 'chiino_custom_realisations_v1';
const HIDDEN_DEFAULT_PRODUCTS_KEY = 'chiino_hidden_default_products_v1';
const HIDDEN_DEFAULT_REALS_KEY = 'chiino_hidden_default_realisations_v1';
const DEFAULT_PRODUCT_OVERRIDES_KEY = 'chiino_default_product_overrides_v1';
const DEFAULT_REAL_OVERRIDES_KEY = 'chiino_default_real_overrides_v1';
const FEATURED_PRODUCTS_KEY = 'chiino_featured_products_v1';
const FEATURED_REALS_KEY = 'chiino_featured_realisations_v1';
const SCHEDULE_ENTRIES_KEY = 'chiino_schedule_entries_v1';
const ADMIN_SESSION_KEY = 'chiino_admin_session_v1';
const ADMIN_PASSWORD_SESSION_KEY = 'chiino_admin_password_v1';

let serverAdminAvailable = false;
let customProductsState = [];
let customRealisationsState = [];
let hiddenDefaultProductsState = [];
let hiddenDefaultRealisationsState = [];
let defaultProductOverridesState = {};
let defaultRealisationOverridesState = {};
let featuredProductsState = [];
let featuredRealisationsState = [];
let scheduleEntriesState = [];
let ordersState = [];
let adminPlannerWeekStartState = null;
let editingProductId = null;
let editingRealId = null;
let editingProductMode = null;
let editingRealMode = null;
// Gestion des jours de disponibilité hebdomadaire (0=dimanche, 1=lundi...)
const AVAILABLE_DAYS_KEY = 'chiino_available_days_v1';
let availableDaysState = [];

const DEFAULT_PRODUCT_ITEMS = [
  {
    id: 'FLASH-GEO-V3',
    name: 'Crème réparatrice',
    supplier: 'TAT-EU',
    shipping: '3-6 jours ouvres',
    shortDesc: 'Hydratation de votre peau.',
    details: 'Crème réparatrice enrichie en agents apaisants pour nourrir la peau tatouée et aider à maintenir son confort au quotidien.',
    price: 28,
    oldPrice: null,
    category: 'modeles',
    badge: 'Nouveau',
    optionLabel: 'Format',
    options: '250ml,500ml',
    imageSrc: 'Assets/pot.png'
  },
  {
    id: 'SOIN-GEL-50',
    name: 'Gel cicatrisant',
    supplier: 'TAT-EU',
    shipping: '3-6 jours ouvres',
    shortDesc: 'Cicatrisation de votre tatouage',
    details: 'Gel cicatrisant à absorption rapide, conçu pour accompagner la phase de cicatrisation et protéger l\'éclat du tatouage.',
    price: 22,
    oldPrice: null,
    category: 'soins',
    badge: 'Déstockage',
    optionLabel: 'Format',
    options: '100ml,250ml',
    imageSrc: 'Assets/gel.png'
  },
  {
    id: 'FLASH-SERPENTS',
    name: 'Flash Tattoo',
    supplier: 'TAT-EU',
    shipping: '3-6 jours ouvres',
    shortDesc: 'A5 couverture rigide, + 100 motifs',
    details: 'Flash Tattoo regroupant une sélection de motifs prêts à tatouer, avec un style marqué pour inspirer ton prochain projet.',
    price: 15,
    oldPrice: null,
    category: 'modeles',
    badge: '',
    optionLabel: '',
    options: '',
    imageSrc: 'Assets/flash.png'
  },
  {
    id: 'NOTEBOOK-CHIINO',
    name: 'Carnet de croquis - Chiino',
    supplier: 'TAT-EU',
    shipping: '3-6 jours ouvres',
    shortDesc: 'A5 couverture rigide, 40 pages',
    details: 'Carnet de croquis - Chiino idéal pour préparer des idées, esquisser des compositions et conserver ses références visuelles.',
    price: 12,
    oldPrice: null,
    category: 'modeles',
    badge: 'Nouveau',
    optionLabel: '',
    options: '',
    imageSrc: 'Assets/croquis.png'
  },
  {
    id: 'TSHIRT-CHIINO',
    name: 'T-shirt - Logo Chiino',
    supplier: 'TAT-EU',
    shipping: '3-6 jours ouvres',
    shortDesc: 'Coton bio, noir, tailles S-XL',
    details: 'T-shirt - Logo Chiino en coton bio, coupe unisexe confortable, avec impression signature pour un look studio affirmé.',
    price: 36,
    oldPrice: 45,
    category: 'vetements',
    badge: '- 20 %',
    optionLabel: 'Taille',
    options: 'S,M,L,XL',
    imageSrc: 'Assets/t-shirt.png'
  }
];

const DEFAULT_REALISATION_ITEMS = [
  { id: 'play-to-good', title: 'Play to Good', style: 'Lettering', imageSrc: 'Assets/bras-lettres2.png' },
  { id: 'harmonie', title: 'Harmonie', style: 'Japonais', imageSrc: 'Assets/cou-japon.png' },
  { id: 'course-du-temps', title: 'Course du temps', style: 'Flash custom', imageSrc: 'Assets/bras-temps.png' },
  { id: 'espoir', title: 'Espoir', style: 'Flash custom', imageSrc: 'Assets/bras-ciel.png' },
  { id: 'date-ancree', title: 'Date ancrée', style: 'Old School', imageSrc: 'Assets/main-date.png' },
  { id: 'fleuraison', title: 'Fleuraison', style: 'Florale', imageSrc: 'Assets/dos-fleur.png' }
];

function getAdminPasswordFromSession() {
  return sessionStorage.getItem(ADMIN_PASSWORD_SESSION_KEY) || '';
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data && data.error ? data.error : 'request-failed';
    throw new Error(message);
  }
  return data;
}

function applyContentState(content) {
  customProductsState = asArray(content.customProducts);
  customRealisationsState = asArray(content.customRealisations);
  hiddenDefaultProductsState = asArray(content.hiddenDefaultProducts);
  hiddenDefaultRealisationsState = asArray(content.hiddenDefaultRealisations);
  defaultProductOverridesState = content.defaultProductOverrides && typeof content.defaultProductOverrides === 'object'
    ? content.defaultProductOverrides
    : {};
  defaultRealisationOverridesState = content.defaultRealisationOverrides && typeof content.defaultRealisationOverrides === 'object'
    ? content.defaultRealisationOverrides
    : {};
  featuredProductsState = asArray(content.featuredProducts);
  featuredRealisationsState = asArray(content.featuredRealisations);
  scheduleEntriesState = asArray(content.scheduleEntries);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function loadStateFromLocalStorage() {
  applyContentState({
    customProducts: readJsonStorage(CUSTOM_PRODUCTS_KEY, []),
    customRealisations: readJsonStorage(CUSTOM_REALS_KEY, []),
    hiddenDefaultProducts: readJsonStorage(HIDDEN_DEFAULT_PRODUCTS_KEY, []),
    hiddenDefaultRealisations: readJsonStorage(HIDDEN_DEFAULT_REALS_KEY, []),
    defaultProductOverrides: readJsonStorage(DEFAULT_PRODUCT_OVERRIDES_KEY, {}),
    defaultRealisationOverrides: readJsonStorage(DEFAULT_REAL_OVERRIDES_KEY, {}),
    featuredProducts: readJsonStorage(FEATURED_PRODUCTS_KEY, []),
    featuredRealisations: readJsonStorage(FEATURED_REALS_KEY, []),
    scheduleEntries: readJsonStorage(SCHEDULE_ENTRIES_KEY, [])
  });

  availableDaysState = readJsonStorage(AVAILABLE_DAYS_KEY, [1,2,3,4,5]); // Par défaut lundi-vendredi
  availableDatesState = readJsonStorage(AVAILABLE_DATES_KEY, []);
}

function persistStateToLocalStorage() {
  writeJsonStorage(CUSTOM_PRODUCTS_KEY, customProductsState);
  writeJsonStorage(CUSTOM_REALS_KEY, customRealisationsState);
  writeJsonStorage(HIDDEN_DEFAULT_PRODUCTS_KEY, hiddenDefaultProductsState);
  writeJsonStorage(HIDDEN_DEFAULT_REALS_KEY, hiddenDefaultRealisationsState);
  writeJsonStorage(DEFAULT_PRODUCT_OVERRIDES_KEY, defaultProductOverridesState);
  writeJsonStorage(DEFAULT_REAL_OVERRIDES_KEY, defaultRealisationOverridesState);
  writeJsonStorage(FEATURED_PRODUCTS_KEY, featuredProductsState);
  writeJsonStorage(FEATURED_REALS_KEY, featuredRealisationsState);
  writeJsonStorage(SCHEDULE_ENTRIES_KEY, scheduleEntriesState);
  writeJsonStorage(AVAILABLE_DAYS_KEY, availableDaysState);
  writeJsonStorage(AVAILABLE_DATES_KEY, availableDatesState);
}

async function tryLoadStateFromServer() {
  try {
    const password = getAdminPasswordFromSession();
    const headers = password ? { 'x-admin-password': password } : {};
    const response = await fetch('/api/admin/content', { headers });

    // Le serveur est joignable mais l'admin n'est pas encore authentifié.
    if (response.status === 401 || response.status === 403) {
      serverAdminAvailable = true;
      return false;
    }

    if (!response.ok) {
      throw new Error('request-failed');
    }

    const data = await response.json().catch(() => ({}));
    serverAdminAvailable = true;
    applyContentState(data);
    return true;
  } catch (error) {
    serverAdminAvailable = false;
    return false;
  }
}

async function isServerReachable() {
  try {
    const response = await fetch('/api/health');
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function refreshContentState() {
  const fromServer = await tryLoadStateFromServer();
  if (!fromServer) {
    loadStateFromLocalStorage();
  }
}

async function adminApi(path, method, body) {
  if (!serverAdminAvailable) {
    throw new Error('server-unavailable');
  }

  const headers = {
    'Content-Type': 'application/json',
    'x-admin-password': getAdminPasswordFromSession()
  };

  return fetchJson(path, {
    method: method || 'GET',
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
}

function readJsonStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(fallback) ? (Array.isArray(parsed) ? parsed : fallback) : (parsed || fallback);
  } catch (error) {
    return fallback;
  }
}

function writeJsonStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeProductCategory(value) {
  const normalized = (value || '').toLowerCase().trim();
  if (normalized.includes('soin')) return 'soins';
  if (normalized.includes('vetement') || normalized.includes('vêtement')) return 'vetements';
  return 'modeles';
}

function getMergedDefaultProduct(id) {
  const base = DEFAULT_PRODUCT_ITEMS.find((item) => item.id === id);
  if (!base) return null;
  const override = defaultProductOverridesState[id] || {};
  return { ...base, ...override };
}

function getMergedDefaultRealisation(id) {
  const base = DEFAULT_REALISATION_ITEMS.find((item) => item.id === id);
  if (!base) return null;
  const override = defaultRealisationOverridesState[id] || {};
  return { ...base, ...override };
}

function applyProductDataToCard(card, product) {
  if (!card || !product) return;

  card.dataset.category = normalizeProductCategory(product.category);
  card.dataset.supplier = product.supplier || card.dataset.supplier || 'Partenaire';
  card.dataset.shipping = product.shipping || card.dataset.shipping || '5-10 jours ouvres';
  card.dataset.details = product.details || product.name;
  card.dataset.price = String(product.price || 0);
  card.dataset.optionLabel = product.optionLabel || '';
  card.dataset.options = product.options || '';

  const titleEl = card.querySelector('.product-info h3');
  const shortEl = card.querySelector('.product-info p');
  if (titleEl) titleEl.textContent = product.name || 'Produit';
  if (shortEl) shortEl.textContent = product.shortDesc || '';

  const image = card.querySelector('.product-img img');
  if (image && product.imageSrc) {
    image.src = product.imageSrc;
    image.alt = product.name || image.alt;
  }

  const imageWrap = card.querySelector('.product-img');
  if (imageWrap) {
    const existingBadge = imageWrap.querySelector('.product-badge');
    if (product.badge) {
      if (existingBadge) {
        existingBadge.textContent = product.badge;
      } else {
        const badge = document.createElement('div');
        badge.className = 'product-badge';
        badge.textContent = product.badge;
        imageWrap.insertBefore(badge, imageWrap.firstChild);
      }
    } else if (existingBadge) {
      existingBadge.remove();
    }
  }

  const footer = card.querySelector('.product-footer');
  if (!footer) return;

  const addButton = footer.querySelector('.add-cart');
  footer.innerHTML = '';

  if (Number(product.oldPrice) > Number(product.price) && Number(product.price) > 0) {
    const wrap = document.createElement('span');
    wrap.className = 'price-wrap';

    const oldPrice = document.createElement('span');
    oldPrice.className = 'price-old';
    oldPrice.textContent = Number(product.oldPrice).toFixed(2).replace('.', ',') + '€';

    const price = document.createElement('span');
    price.className = 'price';
    price.textContent = Number(product.price).toFixed(2).replace('.', ',') + '€';

    wrap.appendChild(oldPrice);
    wrap.appendChild(price);
    footer.appendChild(wrap);
  } else {
    const price = document.createElement('span');
    price.className = 'price';
    price.textContent = Number(product.price || 0).toFixed(2).replace('.', ',') + '€';
    footer.appendChild(price);
  }

  if (addButton) {
    footer.appendChild(addButton);
  }
}

function applyDefaultOverridesOnPublicPages() {
  const productCards = document.querySelectorAll('#page-boutique .shop-grid .product:not([data-custom-item="1"])');
  productCards.forEach((card) => {
    const id = card.dataset.sku;
    const merged = getMergedDefaultProduct(id);
    if (merged) applyProductDataToCard(card, merged);
  });

  const realCards = document.querySelectorAll('#page-realisations .real-grid .real-cell:not([data-custom-item="1"])');
  realCards.forEach((card) => {
    const titleEl = card.querySelector('.cell-title');
    if (!titleEl) return;

    if (!card.dataset.defaultRealId) {
      card.dataset.defaultRealId = slugify(titleEl.textContent || '');
    }

    const merged = getMergedDefaultRealisation(card.dataset.defaultRealId);
    if (!merged) return;

    const styleEl = card.querySelector('.cell-style');
    const img = card.querySelector('img');

    titleEl.textContent = merged.title || titleEl.textContent;
    if (styleEl) styleEl.textContent = merged.style || styleEl.textContent;
    if (img && merged.imageSrc) {
      img.src = merged.imageSrc;
      img.alt = merged.title || img.alt;
    }
  });
}

function getMergedDefaultRealisationsCatalog() {
  return DEFAULT_REALISATION_ITEMS.map((item) => ({
    id: item.id,
    ...(getMergedDefaultRealisation(item.id) || item)
  }));
}

function getMergedDefaultProductsCatalog() {
  return DEFAULT_PRODUCT_ITEMS.map((item) => ({
    id: item.id,
    ...(getMergedDefaultProduct(item.id) || item)
  }));
}

function getEffectiveFeaturedRealisationIds() {
  if (Array.isArray(featuredRealisationsState) && featuredRealisationsState.length) {
    return featuredRealisationsState.slice(0, 4);
  }

  return getMergedDefaultRealisationsCatalog()
    .map((item) => item.id)
    .filter(Boolean)
    .slice(0, 4);
}

function getEffectiveFeaturedProductIds() {
  if (Array.isArray(featuredProductsState) && featuredProductsState.length) {
    return featuredProductsState.slice(0, 3);
  }

  return getMergedDefaultProductsCatalog()
    .filter((item) => !hiddenDefaultProductsState.includes(item.id))
    .map((item) => item.id)
    .filter(Boolean)
    .slice(0, 3);
}

function applyFeaturedRealisationsOnHome() {
  const miniGrid = document.querySelector('#page-accueil .mini-grid');
  if (!miniGrid) return;

  const catalog = getMergedDefaultRealisationsCatalog().concat(
    customRealisationsState.map((item) => ({
      id: item.id,
      title: item.title,
      style: item.style,
      imageSrc: item.imageSrc || 'Assets/bras-ciel.png'
    }))
  );

  const selected = getEffectiveFeaturedRealisationIds()
    .map((id) => catalog.find((item) => item.id === id))
    .filter(Boolean)
    .slice(0, 4);

  if (!selected.length) return;

  miniGrid.innerHTML = selected.map((item, index) => {
    const tilt = index % 2 === 0 ? 'tilt-left' : 'tilt-right';
    return '<div class="mini-cell"><img class="' + tilt + '" src="' + escapeHtml(item.imageSrc || 'Assets/bras-ciel.png') + '" alt="' + escapeHtml(item.title || 'Réalisation') + '" loading="lazy" decoding="async"><div class="cell-overlay"><span class="cell-tag">' + escapeHtml(item.style || 'Flash custom') + '</span></div></div>';
  }).join('');
}

function applyFeaturedProductsOnHome() {
  const bestGrid = document.querySelector('#page-accueil .home-bestsellers .home-best-grid');
  if (!bestGrid) return;

  const catalog = getMergedDefaultProductsCatalog()
    .filter((item) => !hiddenDefaultProductsState.includes(item.id))
    .concat(
      customProductsState.map((item) => ({
        id: item.id,
        name: item.name,
        shortDesc: item.shortDesc,
        price: Number(item.price),
        imageSrc: item.imageSrc || 'Assets/flash.png'
      }))
    );

  const selected = getEffectiveFeaturedProductIds()
    .map((id) => catalog.find((item) => item.id === id))
    .filter(Boolean)
    .slice(0, 3);

  if (!selected.length) return;

  bestGrid.innerHTML = selected.map((item) => {
    const safePrice = Number.isFinite(Number(item.price))
      ? Number(item.price).toFixed(2).replace('.', ',') + '€'
      : '0,00€';
    return '<article class="home-best-card"><div class="home-best-media"><img src="' + escapeHtml(item.imageSrc || 'Assets/flash.png') + '" alt="' + escapeHtml(item.name || 'Produit') + '" loading="lazy" decoding="async"></div><div class="home-best-body"><h3>' + escapeHtml(item.name || 'Produit') + '</h3><p>' + escapeHtml(item.shortDesc || 'Produit recommandé par le studio.') + '</p><div class="home-best-foot"><span>' + safePrice + '</span><button class="add-btn" onclick="window.location.href=\'boutique.html\'">Voir</button></div></div></article>';
  }).join('');
}

function buildCustomProductCard(item) {
  const card = document.createElement('div');
  card.className = 'product';
  card.dataset.customItem = '1';
  card.dataset.sku = item.sku;
  card.dataset.supplier = item.supplier || 'Partenaire';
  card.dataset.shipping = item.shipping || '5-10 jours ouvres';
  card.dataset.price = String(item.price);
  card.dataset.category = normalizeProductCategory(item.category);
  card.dataset.details = item.details || item.shortDesc || item.name;
  card.dataset.optionLabel = item.optionLabel || '';
  card.dataset.options = item.options || '';

  const imageWrap = document.createElement('div');
  imageWrap.className = 'product-img';
  if (item.badge) {
    const badge = document.createElement('div');
    badge.className = 'product-badge';
    badge.textContent = item.badge;
    imageWrap.appendChild(badge);
  }

  const image = document.createElement('img');
  image.src = item.imageSrc || 'Assets/flash.png';
  image.alt = item.name;
  image.loading = 'lazy';
  image.decoding = 'async';
  imageWrap.appendChild(image);

  const info = document.createElement('div');
  info.className = 'product-info';

  const title = document.createElement('h3');
  title.textContent = item.name;

  const short = document.createElement('p');
  short.textContent = item.shortDesc || 'Produit personnalisé';

  const footer = document.createElement('div');
  footer.className = 'product-footer';

  if (item.oldPrice && Number(item.oldPrice) > Number(item.price)) {
    const wrap = document.createElement('span');
    wrap.className = 'price-wrap';

    const oldPrice = document.createElement('span');
    oldPrice.className = 'price-old';
    oldPrice.textContent = Number(item.oldPrice).toFixed(2).replace('.', ',') + '€';

    const price = document.createElement('span');
    price.className = 'price';
    price.textContent = Number(item.price).toFixed(2).replace('.', ',') + '€';

    wrap.appendChild(oldPrice);
    wrap.appendChild(price);
    footer.appendChild(wrap);
  } else {
    const price = document.createElement('span');
    price.className = 'price';
    price.textContent = Number(item.price).toFixed(2).replace('.', ',') + '€';
    footer.appendChild(price);
  }

  const button = document.createElement('button');
  button.className = 'add-btn add-cart';
  button.textContent = "Voir l'article";
  footer.appendChild(button);

  info.appendChild(title);
  info.appendChild(short);
  info.appendChild(footer);

  card.appendChild(imageWrap);
  card.appendChild(info);
  return card;
}

function buildCustomRealisationCard(item, index) {
  const card = document.createElement('div');
  card.className = 'real-cell';
  card.dataset.customItem = '1';

  const img = document.createElement('img');
  img.className = '';
  img.src = item.imageSrc || 'Assets/bras-ciel.png';
  img.alt = item.title || 'Réalisation';
  img.loading = 'lazy';
  img.decoding = 'async';

  const overlay = document.createElement('div');
  overlay.className = 'cell-overlay';

  const title = document.createElement('p');
  title.className = 'cell-title';
  title.textContent = item.title || 'Réalisation';

  const style = document.createElement('p');
  style.className = 'cell-style';
  style.textContent = item.style || 'Flash custom';

  overlay.appendChild(title);
  overlay.appendChild(style);

  card.appendChild(img);
  card.appendChild(overlay);
  return card;
}

function renderCustomProducts() {
  const grid = document.querySelector('#page-boutique .shop-grid');
  if (!grid) return;

  grid.querySelectorAll('.product[data-custom-item="1"]').forEach((node) => node.remove());

  const hiddenDefaultProducts = hiddenDefaultProductsState;
  grid.querySelectorAll('.product').forEach((card) => {
    if (hiddenDefaultProducts.includes(card.dataset.sku)) {
      card.remove();
    }
  });

  const customProducts = customProductsState;
  customProducts.forEach((item) => {
    if (!item || !item.name || !Number.isFinite(Number(item.price))) return;
    grid.appendChild(buildCustomProductCard(item));
  });

  const countEl = document.querySelector('#page-boutique .shop-meta div');
  if (countEl) {
    countEl.textContent = grid.querySelectorAll('.product').length + ' produits';
  }
}

function renderCustomRealisations() {
  const grid = document.querySelector('#page-realisations .real-grid');
  if (!grid) return;

  grid.querySelectorAll('.real-cell[data-custom-item="1"]').forEach((node) => node.remove());

  const hiddenDefaultReals = hiddenDefaultRealisationsState;
  grid.querySelectorAll('.real-cell').forEach((card) => {
    const title = card.querySelector('.cell-title')?.textContent?.trim() || '';
    const defaultId = card.dataset.defaultRealId || slugify(title);
    if (hiddenDefaultReals.includes(defaultId)) {
      card.remove();
    }
  });

  const customReals = customRealisationsState;
  customReals.forEach((item, index) => {
    if (!item || !item.title) return;
    grid.appendChild(buildCustomRealisationCard(item, index));
  });
}

function bindGalleryCells() {
  document.querySelectorAll('.mini-cell, .real-cell').forEach((cell) => {
    if (cell.dataset.lightboxBound === '1') return;
    cell.dataset.lightboxBound = '1';

    cell.addEventListener('click', () => {
      const img = cell.querySelector('img');
      if (!img) return;
      openLightbox(img.src, img.alt);
    });
  });
}

async function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('read-file-failed'));
    reader.readAsDataURL(file);
  });
}

function showAdminFeedback(message, type) {
  const feedback = document.getElementById('admin-feedback');
  if (!feedback) return;
  feedback.textContent = message;
  feedback.classList.add('show');
  feedback.classList.remove('ok', 'err');
  feedback.classList.add(type === 'ok' ? 'ok' : 'err');
}

function getScheduleStatusLabel(status) {
  const key = String(status || 'en-attente').toLowerCase();
  if (key === 'confirme') return 'Confirme';
  if (key === 'refuse') return 'Refuse';
  if (key === 'termine') return 'Termine';
  return 'En attente';
}

function getScheduleStatusClass(status) {
  const key = String(status || 'en-attente').toLowerCase();
  if (key === 'confirme') return 'is-confirmed';
  if (key === 'en-attente' || key === 'en attente') return 'is-pending';
  return 'is-done';
}

function getScheduleDurationMin(entry) {
  const duration = Number(entry?.durationMin || 0);
  return Number.isFinite(duration) && duration > 0 ? duration : 120;
}

function formatDurationLabel(durationMin) {
  const minutes = Math.max(30, Number(durationMin || 120));
  if (minutes % 60 === 0) return (minutes / 60) + 'h';
  return minutes + ' min';
}

function computeScheduleEndTime(startTime, durationMin) {
  const match = String(startTime || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return '';
  const startMinutes = Number(match[1]) * 60 + Number(match[2]);
  if (!Number.isFinite(startMinutes)) return '';
  const end = startMinutes + Math.max(30, Number(durationMin || 120));
  const hour = Math.floor((end % (24 * 60)) / 60);
  const minute = end % 60;
  return String(hour).padStart(2, '0') + ':' + String(minute).padStart(2, '0');
}

function toLocalDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getOrderStatusLabel(status) {
  const key = String(status || '').toLowerCase().trim();
  if (key === 'processing') return 'Preparation';
  if (key === 'fulfilled') return 'Expediee';
  if (key === 'delivered') return 'Livree';
  if (key === 'refunded') return 'Remboursee';
  if (key === 'canceled') return 'Annulee';
  return 'Payee';
}

function getOrderStatusOptions(selected, canShipOrder) {
  const current = String(selected || 'paid').toLowerCase();
  const options = [
    { value: 'paid', label: 'Payee' },
    { value: 'processing', label: 'Preparation' },
    { value: 'fulfilled', label: 'Expediee' },
    { value: 'delivered', label: 'Livree' },
    { value: 'refunded', label: 'Remboursee' },
    { value: 'canceled', label: 'Annulee' }
  ];

  return options.map((option) => {
    const selectedAttr = option.value === current ? ' selected' : '';
    const isShippingStatus = option.value === 'fulfilled' || option.value === 'delivered';
    const disabledAttr = (!canShipOrder && isShippingStatus) ? ' disabled' : '';
    return '<option value="' + option.value + '"' + selectedAttr + disabledAttr + '>' + option.label + '</option>';
  }).join('');
}

function getDispatchStatusLabel(status) {
  const key = String(status || '').toLowerCase().trim();
  if (key === 'sent') return 'Envoyee fournisseur';
  if (key === 'failed') return 'Echec envoi';
  return 'A envoyer manuellement';
}

function renderAdminOrders() {
  const list = document.getElementById('admin-orders-list');
  const controls = document.getElementById('admin-orders-controls');
  if (controls && !controls.dataset.enhanced) {
    controls.innerHTML = '<button id="toggle-canceled-orders" class="add-btn">Afficher commandes annulées/remboursées</button> <button id="export-orders-excel" class="add-btn">Exporter Excel</button>';
    controls.dataset.enhanced = '1';
    document.getElementById('toggle-canceled-orders').onclick = () => {
      window.showAllOrders = !window.showAllOrders;
      renderAdminOrders();
    };
    document.getElementById('export-orders-excel').onclick = () => {
      exportOrdersToExcel();
    };
  }
  if (!list) return;

  if (!serverAdminAvailable) {
    list.innerHTML = '<p style="font-size:11px;color:var(--muted)">Le suivi commandes est disponible quand le serveur API est accessible.</p>';
    return;
  }

  const orders = Array.isArray(ordersState) ? ordersState : [];
  let filteredOrders = orders;
  if (!window.showAllOrders) {
    filteredOrders = orders.filter(order => {
      const status = String(order.status || '').toLowerCase();
      return status !== 'canceled' && status !== 'cancelled' && status !== 'refunded' && status !== 'remboursee' && status !== 'rembourse';
    });
  }
  if (!filteredOrders.length) {
    list.innerHTML = '<p style="font-size:11px;color:var(--muted)">Aucune commande enregistrée pour le moment.</p>';
    return;
  }

  list.innerHTML = filteredOrders.map((order) => {
    const createdAt = order.createdAt
      ? new Date(order.createdAt).toLocaleString('fr-FR')
      : 'Date inconnue';
    const amountText = Number.isFinite(Number(order.amountTotal))
      ? (Number(order.amountTotal) / 100).toFixed(2).replace('.', ',') + ' ' + String(order.currency || 'EUR').toUpperCase()
      : '0,00 EUR';

    const canRetryDispatch = String(order.dispatchStatus || '') !== 'sent';
    const canShipOrder = String(order.dispatchStatus || '').toLowerCase() === 'sent';
    const dispatchButtonLabel = String(order.dispatchStatus || '') === 'failed'
      ? 'Relancer envoi TAT-EU'
      : 'Envoyer a TAT-EU';

    return '<div class="admin-order-row">' +
      '<div class="admin-order-top">' +
        '<strong>' + escapeHtml(order.orderRef || order.id || 'Commande') + '</strong>' +
        '<span>' + escapeHtml(getOrderStatusLabel(order.status)) + '</span>' +
      '</div>' +
      '<p class="admin-order-line">' + escapeHtml(createdAt) + ' • ' + escapeHtml(amountText) + '</p>' +
      '<p class="admin-order-line">Client: ' + escapeHtml(order.customerName || 'Non renseigne') + (order.customerEmail ? ' • ' + escapeHtml(order.customerEmail) : '') + '</p>' +
      (order.customerFirstName ? '<p class="admin-order-line">Prénom: ' + escapeHtml(order.customerFirstName) + '</p>' : '') +
      (order.customerAddress ? '<p class="admin-order-line">Adresse: ' + escapeHtml(order.customerAddress) + '</p>' : '') +
      (order.customerPhone ? '<p class="admin-order-line">Téléphone: ' + escapeHtml(order.customerPhone) + '</p>' : '') +
      '<p class="admin-order-line">Produits: ' + escapeHtml(order.itemsLabel || 'Non disponible') + '</p>' +
      '<p class="admin-order-line">Fournisseur: ' + escapeHtml(order.supplierProvider || 'Auto') + ' • ' + escapeHtml(getDispatchStatusLabel(order.dispatchStatus)) + (order.supplierOrderId ? (' • Ref: ' + escapeHtml(order.supplierOrderId)) : '') + '</p>' +
      (!canShipOrder ? '<p class="admin-order-line">Info: envoi manuel TAT-EU requis avant statut Expediee/Livree.</p>' : '') +
      (order.dispatchMessage ? '<p class="admin-order-line">Detail envoi: ' + escapeHtml(order.dispatchMessage) + '</p>' : '') +
      '<div class="admin-order-controls">' +
        '<select data-order-status="' + escapeHtml(order.id || '') + '" data-order-dispatched="' + (canShipOrder ? '1' : '0') + '">' + getOrderStatusOptions(order.status, canShipOrder) + '</select>' +
        '<input type="text" data-order-tracking="' + escapeHtml(order.id || '') + '" placeholder="Tracking" value="' + escapeHtml(order.trackingNumber || '') + '">' +
      '</div>' +
      '<textarea data-order-note="' + escapeHtml(order.id || '') + '" placeholder="Note interne">' + escapeHtml(order.adminNote || '') + '</textarea>' +
      '<div class="admin-row-actions"><button class="add-btn" data-order-save="' + escapeHtml(order.id || '') + '">Enregistrer</button>' + (canRetryDispatch ? '<button class="add-btn" data-order-dispatch="' + escapeHtml(order.id || '') + '">' + dispatchButtonLabel + '</button>' : '') + '</div>' +
    '</div>';
  }).join('');
}

function renderAdminSchedulePlanner() {
  const planner = document.getElementById('admin-schedule-planner');
  if (!planner) return;

  const sortedEntries = scheduleEntriesState
    .slice()
    .sort((a, b) => String((a.date || '') + (a.time || '')).localeCompare(String((b.date || '') + (b.time || ''))));

  const getWeekStartMonday = (baseDate) => {
    const date = new Date(baseDate);
    const day = date.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    date.setDate(date.getDate() + diffToMonday);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const parseEntryDate = (entry) => {
    const raw = String(entry.date || '').trim();
    if (!raw) return null;
    const parsed = new Date(raw + 'T00:00:00');
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const datedEntries = sortedEntries
    .map((entry) => ({ entry, dateObj: parseEntryDate(entry) }))
    .filter((item) => item.dateObj);

  const referenceDate = (datedEntries.find((item) => item.dateObj.getTime() >= now.getTime()) || datedEntries[0] || { dateObj: now }).dateObj;
  const defaultWeekStart = getWeekStartMonday(referenceDate);
  if (!adminPlannerWeekStartState) {
    adminPlannerWeekStartState = toLocalDateKey(defaultWeekStart);
  }

  const weekStart = getWeekStartMonday(new Date(adminPlannerWeekStartState + 'T00:00:00'));
  if (Number.isNaN(weekStart.getTime())) {
    adminPlannerWeekStartState = toLocalDateKey(defaultWeekStart);
    weekStart.setTime(defaultWeekStart.getTime());
  }

  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return {
      key: toLocalDateKey(date),
      label: date.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' })
    };
  });

  const startHour = 9;
  const endHour = 19;

  const outsideGrid = [];

  sortedEntries.forEach((entry) => {
    const dateObj = parseEntryDate(entry);
    const timeRaw = String(entry.time || '').trim();
    const match = timeRaw.match(/^(\d{1,2}):(\d{2})$/);

    if (!dateObj || !match) {
      outsideGrid.push(entry);
      return;
    }

    const hour = Number(match[1]);
    const minute = Number(match[2]);
    const startMinutes = (hour * 60) + minute;
    const durationMin = getScheduleDurationMin(entry);
    const endMinutes = startMinutes + durationMin;
    const dateKey = toLocalDateKey(dateObj);
    const inWeek = weekDays.some((d) => d.key === dateKey);
    const visibleStart = startHour * 60;
    const visibleEnd = (endHour + 1) * 60;
    if (!inWeek || endMinutes <= visibleStart || startMinutes >= visibleEnd) {
      outsideGrid.push(entry);
      return;
    }

  });

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const weekTitle = `Semaine du ${weekStart.toLocaleDateString('fr-FR')} au ${weekEnd.toLocaleDateString('fr-FR')}`;

  const emptyHint = !sortedEntries.length
    ? '<div class="admin-week-empty">Aucune reservation pour le moment. Le planning est pret a recevoir les futurs rendez-vous.</div>'
    : '';

  const outsideMarkup = outsideGrid.length
    ? '<div class="admin-week-outside"><strong>Hors plage visible</strong><span>' + outsideGrid.length + ' rendez-vous (horaire/date en dehors de 09:00-19:00 ou autre semaine).</span></div>'
    : '';

  const weekDayKeys = new Set(weekDays.map((d) => d.key));
  const todayKey = toLocalDateKey(new Date());
  const totalReservations = sortedEntries.filter((entry) => /^\d{4}-\d{2}-\d{2}$/.test(String(entry.date || '').trim())).length;
  const weekReservations = sortedEntries.filter((entry) => weekDayKeys.has(String(entry.date || '').trim())).length;
  const todayReservations = sortedEntries.filter((entry) => String(entry.date || '').trim() === todayKey).length;

  const mobileDaysMarkup = weekDays.map((day, index) => {
    const dayDate = new Date(day.key + 'T00:00:00');
    const dayLabel = Number.isNaN(dayDate.getTime())
      ? day.key
      : dayDate.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: '2-digit' });

    const dayEntries = sortedEntries
      .filter((entry) => String(entry.date || '') === day.key)
      .filter((entry) => /^\d{1,2}:\d{2}$/.test(String(entry.time || '').trim()))
      .sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')));

    const rows = dayEntries.length
      ? dayEntries.map((entry) => {
        const statusClass = getScheduleStatusClass(entry.status);
        const statusLabel = getScheduleStatusLabel(entry.status);
        const durationMin = getScheduleDurationMin(entry);
        const endTime = computeScheduleEndTime(entry.time, durationMin);
        const timeRange = endTime
          ? (String(entry.time || '--:--') + '-' + endTime)
          : String(entry.time || '--:--');

        return '<button type="button" class="admin-mobile-slot admin-existing-row admin-existing-row-clickable ' + statusClass + '" data-schedule-edit="' + escapeHtml(entry.id || '') + '"><strong>' + escapeHtml(timeRange) + ' • ' + escapeHtml(entry.clientName || 'Client inconnu') + '</strong><span>' + escapeHtml(statusLabel) + ' • ' + escapeHtml(formatDurationLabel(durationMin)) + '</span></button>';
      }).join('')
      : '<p class="admin-mobile-empty">Aucun rendez-vous prévu.</p>';

    const openAttr = (day.key === todayKey || (index === 0 && todayKey < weekDays[0].key)) ? ' open' : '';
    const countLabel = dayEntries.length + ' rendez-vous';

    return '<details class="admin-mobile-day"' + openAttr + '><summary class="admin-mobile-day-summary"><strong>' + escapeHtml(dayLabel) + '</strong><span>' + escapeHtml(countLabel) + '</span></summary><div class="admin-mobile-day-body"><div class="admin-mobile-day-list">' + rows + '</div></div></details>';
  }).join('');

  planner.innerHTML =
    '<div class="admin-week-head"><strong>' + escapeHtml(weekTitle) + '</strong><div class="admin-week-head-right"><span>Planning semaine</span><div class="admin-planner-stats"><span class="admin-planner-stat">Aujourd\'hui: ' + escapeHtml(String(todayReservations)) + '</span><span class="admin-planner-stat">Semaine: ' + escapeHtml(String(weekReservations)) + '</span><span class="admin-planner-stat">Total: ' + escapeHtml(String(totalReservations)) + '</span></div><div class="admin-week-nav"><button type="button" class="add-btn admin-week-nav-btn" data-schedule-week-nav="prev" aria-label="Semaine precedente">&#8592;</button><button type="button" class="add-btn admin-week-nav-btn is-today" data-schedule-week-nav="today" aria-label="Revenir a la semaine en cours">Aujourd\'hui</button><button type="button" class="add-btn admin-week-nav-btn" data-schedule-week-nav="next" aria-label="Semaine suivante">&#8594;</button></div></div></div>' +
    '<div class="admin-mobile-week">' + mobileDaysMarkup + '</div>' +
    emptyHint +
    outsideMarkup;
}

function renderAdminLists() {
  const defaultProductList = document.getElementById('admin-default-products-list');
  const defaultRealList = document.getElementById('admin-default-reals-list');
  const featuredProductsList = document.getElementById('admin-featured-products-list');
  const featuredList = document.getElementById('admin-featured-list');
  if (!defaultProductList || !defaultRealList) return;

  const products = customProductsState;
  const reals = customRealisationsState;
  const hiddenDefaultProducts = hiddenDefaultProductsState;
  const hiddenDefaultReals = hiddenDefaultRealisationsState;

  const defaultProductRows = DEFAULT_PRODUCT_ITEMS.map((item) => {
    const merged = getMergedDefaultProduct(item.id) || item;
    const hidden = hiddenDefaultProducts.includes(item.id);
    return '<div class="admin-row"><div><strong>' + escapeHtml(merged.name) + '</strong><span>' + escapeHtml(item.id) + '</span></div><div class="admin-row-actions"><button class="add-btn" data-edit-default-product="' + escapeHtml(item.id) + '">Modifier</button><button class="add-btn" data-toggle-default-product="' + escapeHtml(item.id) + '">' + (hidden ? 'Restaurer' : 'Supprimer') + '</button></div></div>';
  });

  const customProductRows = products.map((item) => {
    return '<div class="admin-row"><div><strong>' + escapeHtml(item.name) + '</strong><span>Personnalisé • ' + escapeHtml(item.category) + ' • ' + Number(item.price).toFixed(2).replace('.', ',') + '€</span></div><div class="admin-row-actions"><button class="add-btn" data-edit-product="' + escapeHtml(item.id) + '">Modifier</button><button class="add-btn" data-remove-product="' + escapeHtml(item.id) + '">Supprimer</button></div></div>';
  });

  defaultProductList.innerHTML = defaultProductRows.concat(customProductRows).join('');

  if (featuredProductsList) {
    const options = getMergedDefaultProductsCatalog()
      .filter((item) => !hiddenDefaultProducts.includes(item.id))
      .concat(
        customProductsState.map((item) => ({
          id: item.id,
          name: item.name,
          category: item.category
        }))
      );

    featuredProductsList.innerHTML = options.map((item) => {
      const checked = getEffectiveFeaturedProductIds().includes(item.id) ? 'checked' : '';
      return '<label class="admin-row"><div><strong>' + escapeHtml(item.name || 'Produit') + '</strong><span>' + escapeHtml(item.category || 'Produit') + '</span></div><input type="checkbox" data-featured-product-id="' + escapeHtml(item.id) + '" ' + checked + '></label>';
    }).join('');
  }

  const defaultRealRows = DEFAULT_REALISATION_ITEMS.map((item) => {
    const merged = getMergedDefaultRealisation(item.id) || item;
    const hidden = hiddenDefaultReals.includes(item.id);
    return '<div class="admin-row"><div><strong>' + escapeHtml(merged.title || merged.name) + '</strong><span>' + escapeHtml(item.id) + '</span></div><div class="admin-row-actions"><button class="add-btn" data-edit-default-real="' + escapeHtml(item.id) + '">Modifier</button><button class="add-btn" data-toggle-default-real="' + escapeHtml(item.id) + '">' + (hidden ? 'Restaurer' : 'Supprimer') + '</button></div></div>';
  });

  const customRealRows = reals.map((item) => {
    return '<div class="admin-row"><div><strong>' + escapeHtml(item.title) + '</strong><span>Personnalisé • ' + escapeHtml(item.style) + '</span></div><div class="admin-row-actions"><button class="add-btn" data-edit-real="' + escapeHtml(item.id) + '">Modifier</button><button class="add-btn" data-remove-real="' + escapeHtml(item.id) + '">Supprimer</button></div></div>';
  });

  defaultRealList.innerHTML = defaultRealRows.concat(customRealRows).join('');

  if (featuredList) {
    const options = getMergedDefaultRealisationsCatalog().concat(
      customRealisationsState.map((item) => ({
        id: item.id,
        title: item.title,
        style: item.style
      }))
    );

    featuredList.innerHTML = options.map((item) => {
      const checked = getEffectiveFeaturedRealisationIds().includes(item.id) ? 'checked' : '';
      return '<label class="admin-row"><div><strong>' + escapeHtml(item.title || item.name) + '</strong><span>' + escapeHtml(item.style || '') + '</span></div><input type="checkbox" data-featured-id="' + escapeHtml(item.id) + '" ' + checked + '></label>';
    }).join('');
  }

  renderAdminOrders();
  renderAdminSchedulePlanner();

}

function initAdminBackoffice() {
  const page = document.getElementById('page-admin');
  if (!page) return;

  // Gestion du formulaire jours disponibles
  const availableDaysForm = document.getElementById('admin-available-days-form');
  const availableDaysInputs = availableDaysForm ? availableDaysForm.querySelectorAll('input[type="checkbox"][name="availableDays"]') : [];
  const availableDaysSaved = document.getElementById('admin-available-days-saved');

  // Initialisation des cases à cocher selon l'état
  if (availableDaysInputs && availableDaysInputs.length) {
    availableDaysInputs.forEach(input => {
      input.checked = availableDaysState.includes(Number(input.value));
    });
  }

  // Sauvegarde lors de la soumission
  if (availableDaysForm) {
    availableDaysForm.addEventListener('submit', function(e) {
      e.preventDefault();
      availableDaysState = Array.from(availableDaysInputs)
        .filter(input => input.checked)
        .map(input => Number(input.value));
      writeJsonStorage(AVAILABLE_DAYS_KEY, availableDaysState);
      if (availableDaysSaved) {
        availableDaysSaved.style.display = 'inline';
        setTimeout(() => { availableDaysSaved.style.display = 'none'; }, 1200);
      }
    });
  }

  // Calendrier mensuel de disponibilités
  const calendarWrap = document.getElementById('admin-available-calendar-wrap');
  const calendarSaved = document.getElementById('admin-available-calendar-saved');
  const saveCalendarBtn = document.getElementById('admin-save-available-calendar');
  if (calendarWrap) {
    bindAdminAvailableCalendar();
    saveCalendarBtn?.addEventListener('click', function(e) {
      e.preventDefault();
      writeJsonStorage(AVAILABLE_DATES_KEY, availableDatesState);
      if (calendarSaved) {
        calendarSaved.style.display = 'inline';
        setTimeout(() => { calendarSaved.style.display = 'none'; }, 1200);
      }
    });
  }

  const loginWrap = document.getElementById('admin-login-wrap');
  const panel = document.getElementById('admin-panel');
  const loginBtn = document.getElementById('admin-login-btn');
  const passwordInput = document.getElementById('admin-password');
  const loginFeedback = document.getElementById('admin-login-feedback');
  const homeCard = document.getElementById('admin-home');
  const moduleOrders = document.getElementById('admin-module-orders');
  const moduleProducts = document.getElementById('admin-module-products');
  const moduleReals = document.getElementById('admin-module-reals');
  const moduleSchedule = document.getElementById('admin-module-schedule');
  const refreshOrdersBtn = document.getElementById('admin-refresh-orders');
  const productFormTitle = document.getElementById('admin-product-form-title');
  const realFormTitle = document.getElementById('admin-real-form-title');
  const cancelProductEditBtn = document.getElementById('admin-cancel-product-edit');
  const cancelRealEditBtn = document.getElementById('admin-cancel-real-edit');

  const productNameInput = document.getElementById('admin-product-name');
  const productShortInput = document.getElementById('admin-product-short');
  const productPriceInput = document.getElementById('admin-product-price');
  const productOldPriceInput = document.getElementById('admin-product-old-price');
  const productCategoryInput = document.getElementById('admin-product-category');
  const productBadgeInput = document.getElementById('admin-product-badge');
  const productOptionLabelInput = document.getElementById('admin-product-option-label');
  const productOptionsInput = document.getElementById('admin-product-options');
  const productDetailsInput = document.getElementById('admin-product-details');
  const productImageUrlInput = document.getElementById('admin-product-image-url');
  const productImageFileInput = document.getElementById('admin-product-image-file');

  const realTitleInput = document.getElementById('admin-real-title');
  const realStyleInput = document.getElementById('admin-real-style');
  const realImageUrlInput = document.getElementById('admin-real-image-url');
  const realImageFileInput = document.getElementById('admin-real-image-file');

  const scheduleModal = document.getElementById('admin-schedule-modal');
  const scheduleModalTitle = document.getElementById('admin-schedule-modal-title');
  const openScheduleModalBtn = document.getElementById('admin-open-schedule-modal');
  const closeScheduleModalBtn = document.getElementById('admin-close-schedule-modal');
  const cancelScheduleModalBtn = document.getElementById('admin-cancel-schedule-modal');
  const addScheduleBtn = document.getElementById('admin-add-schedule');
  const deleteScheduleBtn = document.getElementById('admin-delete-schedule');
  const scheduleClientInput = document.getElementById('admin-schedule-client');
  const scheduleDateInput = document.getElementById('admin-schedule-date');
  const scheduleTimeInput = document.getElementById('admin-schedule-time');
  const scheduleDurationInput = document.getElementById('admin-schedule-duration');
  const scheduleStatusInput = document.getElementById('admin-schedule-status');
  const scheduleNoteInput = document.getElementById('admin-schedule-note');
  const scheduleSlotInfo = document.getElementById('admin-schedule-slot-info');
  const scheduleOverlapWarning = document.getElementById('admin-schedule-overlap-warning');
  const scheduleExisting = document.getElementById('admin-schedule-existing');
  const scheduleAttachments = document.getElementById('admin-schedule-attachments');
  const schedulePlanner = document.getElementById('admin-schedule-planner');
  let editingScheduleId = null;

  const resetProductForm = () => {
    editingProductId = null;
    editingProductMode = null;
    if (productFormTitle) productFormTitle.textContent = 'Ajouter un produit';
    if (addProductBtn) addProductBtn.textContent = 'Ajouter le produit';
    if (cancelProductEditBtn) cancelProductEditBtn.style.display = 'none';

    if (productNameInput) productNameInput.value = '';
    if (productShortInput) productShortInput.value = '';
    if (productPriceInput) productPriceInput.value = '';
    if (productOldPriceInput) productOldPriceInput.value = '';
    if (productCategoryInput) productCategoryInput.value = 'modeles';
    if (productBadgeInput) productBadgeInput.value = '';
    if (productOptionLabelInput) productOptionLabelInput.value = '';
    if (productOptionsInput) productOptionsInput.value = '';
    if (productDetailsInput) productDetailsInput.value = '';
    if (productImageUrlInput) productImageUrlInput.value = '';
    if (productImageFileInput) productImageFileInput.value = '';
  };

  const resetRealForm = () => {
    editingRealId = null;
    editingRealMode = null;
    if (realFormTitle) realFormTitle.textContent = 'Ajouter une réalisation';
    if (addRealBtn) addRealBtn.textContent = 'Ajouter la réalisation';
    if (cancelRealEditBtn) cancelRealEditBtn.style.display = 'none';

    if (realTitleInput) realTitleInput.value = '';
    if (realStyleInput) realStyleInput.value = 'Géométrique';
    if (realImageUrlInput) realImageUrlInput.value = '';
    if (realImageFileInput) realImageFileInput.value = '';
  };

  const resetScheduleForm = () => {
    editingScheduleId = null;
    if (scheduleModalTitle) scheduleModalTitle.textContent = 'Ajouter un créneau planning';
    if (addScheduleBtn) addScheduleBtn.textContent = 'Ajouter au planning';
    if (deleteScheduleBtn) deleteScheduleBtn.style.display = 'none';
    if (scheduleClientInput) scheduleClientInput.value = '';
    if (scheduleDateInput) scheduleDateInput.value = '';
    if (scheduleTimeInput) scheduleTimeInput.value = '';
    if (scheduleDurationInput) scheduleDurationInput.value = '120';
    if (scheduleStatusInput) scheduleStatusInput.value = 'en-attente';
    if (scheduleNoteInput) scheduleNoteInput.value = '';
    if (scheduleOverlapWarning) {
      scheduleOverlapWarning.textContent = '';
      scheduleOverlapWarning.classList.remove('show');
    }
    if (scheduleAttachments) scheduleAttachments.innerHTML = '';
  };

  const parseTimeToMinutes = (value) => {
    const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (!Number.isFinite(hour) || !Number.isFinite(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
    return (hour * 60) + minute;
  };

  const renderScheduleOverlapWarning = () => {
    if (!scheduleOverlapWarning) return;

    const dateValue = scheduleDateInput?.value?.trim() || '';
    const timeValue = scheduleTimeInput?.value?.trim() || '';
    const durationMin = Math.max(30, Number(scheduleDurationInput?.value || 120));
    const start = parseTimeToMinutes(timeValue);

    if (!dateValue || start === null) {
      scheduleOverlapWarning.textContent = '';
      scheduleOverlapWarning.classList.remove('show');
      return;
    }

    const end = start + (Number.isFinite(durationMin) ? durationMin : 120);
    const overlaps = scheduleEntriesState
      .filter((entry) => String(entry.date || '') === dateValue)
      .filter((entry) => String(entry.id || '') !== String(editingScheduleId || ''))
      .filter((entry) => {
        const otherStart = parseTimeToMinutes(entry.time);
        if (otherStart === null) return false;
        const otherDuration = getScheduleDurationMin(entry);
        const otherEnd = otherStart + otherDuration;
        return start < otherEnd && end > otherStart;
      })
      .sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')));

    if (!overlaps.length) {
      scheduleOverlapWarning.textContent = '';
      scheduleOverlapWarning.classList.remove('show');
      return;
    }

    const labels = overlaps.slice(0, 3).map((entry) => String(entry.time || '--:--') + ' • ' + String(entry.clientName || 'Client inconnu'));
    const suffix = overlaps.length > 3 ? ' et ' + (overlaps.length - 3) + ' autre(s)' : '';

    scheduleOverlapWarning.textContent = 'Attention: chevauchement détecté avec ' + labels.join(', ') + suffix + '.';
    scheduleOverlapWarning.classList.add('show');
  };

  const renderScheduleAttachments = (entry) => {
    if (!scheduleAttachments) return;

    const attachments = Array.isArray(entry?.attachments)
      ? entry.attachments.filter((item) => String(item?.dataUrl || '').startsWith('data:image/'))
      : [];

    if (!attachments.length) {
      scheduleAttachments.innerHTML = '<p style="font-size:11px;color:var(--muted)">Aucune image jointe pour ce créneau.</p>';
      return;
    }

    const images = attachments.map((item, index) => {
      const src = escapeHtml(String(item.dataUrl || ''));
      const alt = escapeHtml(String(item.name || ('Image ' + (index + 1))));
      return '<a class="admin-attachment-item" href="' + src + '" target="_blank" rel="noopener noreferrer"><img src="' + src + '" alt="' + alt + '"></a>';
    }).join('');

    scheduleAttachments.innerHTML = '<p class="admin-attachments-title">Images du client</p><div class="admin-attachments-grid">' + images + '</div>';
  };

  const renderScheduleExistingForSlot = (dateValue, timeValue) => {
    if (!scheduleExisting || !scheduleSlotInfo) return;

    if (!dateValue || !timeValue) {
      scheduleSlotInfo.textContent = 'Sélectionnez une date et une heure pour voir les créneaux prévus.';
      scheduleExisting.innerHTML = '<p style="font-size:11px;color:var(--muted)">Aucun créneau sélectionné.</p>';
      return;
    }

    const slotLabelDate = new Date(dateValue + 'T00:00:00');
    const humanDate = Number.isNaN(slotLabelDate.getTime())
      ? dateValue
      : slotLabelDate.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
    scheduleSlotInfo.textContent = 'Créneau sélectionné : ' + humanDate + ' à ' + timeValue;

    const entries = scheduleEntriesState
      .filter((entry) => String(entry.date || '') === dateValue && String(entry.time || '') === timeValue)
      .sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));

    if (!entries.length) {
      scheduleExisting.innerHTML = '<p style="font-size:11px;color:var(--muted)">Aucun rendez-vous prévu sur ce créneau.</p>';
      return;
    }

    scheduleExisting.innerHTML = entries.map((entry) => {
      const statusClass = getScheduleStatusClass(entry.status);
      const durationMin = getScheduleDurationMin(entry);
      const note = String(entry.note || '').trim();
      const noteMarkup = note ? '<span class="admin-existing-note">' + escapeHtml(note) + '</span>' : '';
      return '<button type="button" class="admin-existing-row admin-existing-row-clickable ' + statusClass + '" data-schedule-edit="' + escapeHtml(entry.id || '') + '"><strong>' + escapeHtml(entry.clientName || 'Client inconnu') + '</strong><span>' + escapeHtml(getScheduleStatusLabel(entry.status)) + ' • ' + escapeHtml(formatDurationLabel(durationMin)) + '</span>' + noteMarkup + '</button>';
    }).join('');
  };

  const closeScheduleModal = () => {
    if (!scheduleModal) return;
    scheduleModal.classList.remove('open');
    scheduleModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  const openScheduleModal = (options) => {
    if (!scheduleModal) return;

    const dateValue = options && options.date ? options.date : '';
    const timeValue = options && options.time ? options.time : '';

    resetScheduleForm();
    if (scheduleDateInput && dateValue) scheduleDateInput.value = dateValue;
    if (scheduleTimeInput && timeValue) scheduleTimeInput.value = timeValue;
    renderScheduleExistingForSlot(scheduleDateInput?.value || '', scheduleTimeInput?.value || '');
    renderScheduleOverlapWarning();
    if (scheduleAttachments) scheduleAttachments.innerHTML = '';

    scheduleModal.classList.add('open');
    scheduleModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    scheduleClientInput?.focus();
  };

  const openScheduleModalForEdit = (entryId) => {
    const entry = scheduleEntriesState.find((item) => item.id === entryId);
    if (!entry) {
      showAdminFeedback('Créneau introuvable.', 'err');
      return;
    }

    resetScheduleForm();
    editingScheduleId = entry.id;
    if (scheduleModalTitle) scheduleModalTitle.textContent = 'Modifier le créneau planning';
    if (addScheduleBtn) addScheduleBtn.textContent = 'Enregistrer les modifications';
    if (deleteScheduleBtn) deleteScheduleBtn.style.display = 'inline-flex';

    if (scheduleClientInput) scheduleClientInput.value = String(entry.clientName || '');
    if (scheduleDateInput) scheduleDateInput.value = String(entry.date || '');
    if (scheduleTimeInput) scheduleTimeInput.value = String(entry.time || '');
    if (scheduleDurationInput) scheduleDurationInput.value = String(entry.durationMin || 120);
    if (scheduleStatusInput) scheduleStatusInput.value = String(entry.status || 'en-attente');
    if (scheduleNoteInput) scheduleNoteInput.value = String(entry.note || '');
    renderScheduleExistingForSlot(scheduleDateInput?.value || '', scheduleTimeInput?.value || '');
    renderScheduleOverlapWarning();
    renderScheduleAttachments(entry);

    scheduleModal.classList.add('open');
    scheduleModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    scheduleClientInput?.focus();
  };

  const setLoginFeedback = (message, type) => {
    if (!loginFeedback) return;
    loginFeedback.textContent = message;
    if (!message) {
      loginFeedback.classList.remove('show', 'ok', 'err');
      return;
    }
    loginFeedback.classList.add('show');
    loginFeedback.classList.remove('ok', 'err');
    loginFeedback.classList.add(type === 'ok' ? 'ok' : 'err');
  };

  const loadAdminOrders = async () => {
    if (!serverAdminAvailable) {
      ordersState = [];
      renderAdminOrders();
      return;
    }

    try {
      const data = await adminApi('/api/admin/orders', 'GET');
      ordersState = Array.isArray(data.orders) ? data.orders : [];
      renderAdminOrders();
    } catch (error) {
      ordersState = [];
      renderAdminOrders();
      showAdminFeedback('Impossible de charger les commandes.', 'err');
    }
  };

  const showAdminModule = (target) => {
    const key = target || 'home';
    if (homeCard) homeCard.style.display = key === 'home' ? '' : 'none';
    if (moduleOrders) moduleOrders.style.display = key === 'orders' ? '' : 'none';
    if (moduleProducts) moduleProducts.style.display = key === 'products' ? '' : 'none';
    if (moduleReals) moduleReals.style.display = key === 'reals' ? '' : 'none';
    if (moduleSchedule) moduleSchedule.style.display = key === 'schedule' ? '' : 'none';
    if (key === 'orders') {
      loadAdminOrders();
    }
    if (key === 'schedule') {
      adminPlannerWeekStartState = null;
      renderAdminSchedulePlanner();
    }
  };

  const unlockPanel = async () => {
    if (loginWrap) loginWrap.style.display = 'none';
    if (panel) panel.style.display = 'grid';
    await refreshContentState();
    await loadAdminOrders();
    renderAdminLists();
    showAdminModule('home');
  };

  page.querySelectorAll('[data-admin-target]').forEach((btn) => {
    btn.addEventListener('click', () => showAdminModule(btn.dataset.adminTarget));
  });

  refreshOrdersBtn?.addEventListener('click', () => {
    loadAdminOrders();
  });

  if (sessionStorage.getItem(ADMIN_SESSION_KEY) === 'ok') {
    unlockPanel().catch(() => {
      loadStateFromLocalStorage();
      renderAdminLists();
    });
  }

  loginBtn?.addEventListener('click', async () => {
    const password = passwordInput?.value || '';

    if (!password) {
      setLoginFeedback('Mot de passe requis.', 'err');
      return;
    }

    const serverReachable = await isServerReachable();
    if (serverReachable) {
      try {
        await fetchJson('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password })
        });
      } catch (error) {
        setLoginFeedback('Mot de passe incorrect.', 'err');
        return;
      }
    } else {
      setLoginFeedback('Serveur inaccessible. Réessayez plus tard.', 'err');
      return;
    }

    sessionStorage.setItem(ADMIN_SESSION_KEY, 'ok');
    sessionStorage.setItem(ADMIN_PASSWORD_SESSION_KEY, password);
    setLoginFeedback('', '');
    await unlockPanel();
  });

  const addProductBtn = document.getElementById('admin-add-product');
  addProductBtn?.addEventListener('click', async () => {
    const name = productNameInput?.value?.trim() || '';
    const shortDesc = productShortInput?.value?.trim() || '';
    const priceRaw = productPriceInput?.value?.trim() || '';
    const oldPriceRaw = productOldPriceInput?.value?.trim() || '';
    const category = productCategoryInput?.value || 'modeles';
    const badge = productBadgeInput?.value?.trim() || '';
    const optionLabel = productOptionLabelInput?.value?.trim() || '';
    const options = productOptionsInput?.value?.trim() || '';
    const details = productDetailsInput?.value?.trim() || '';
    const imageUrl = productImageUrlInput?.value?.trim() || '';
    const imageFile = productImageFileInput?.files?.[0] || null;

    const price = Number(priceRaw.replace(',', '.'));
    const oldPrice = Number(oldPriceRaw.replace(',', '.'));

    if (!name || !Number.isFinite(price) || price <= 0) {
      showAdminFeedback('Produit: nom et prix valide sont requis.', 'err');
      return;
    }

    const existingProduct = editingProductId
      ? (editingProductMode === 'default'
        ? getMergedDefaultProduct(editingProductId)
        : customProductsState.find((item) => item.id === editingProductId))
      : null;

    let imageSrc = imageUrl || (existingProduct?.imageSrc || '');
    if (!imageSrc && imageFile) {
      try {
        imageSrc = await readFileAsDataUrl(imageFile);
      } catch (error) {
        showAdminFeedback('Impossible de lire l\'image sélectionnée.', 'err');
        return;
      }
    }

    const productPayload = {
      id: editingProductId || ('prod-' + Date.now().toString(36)),
      sku: existingProduct?.sku || editingProductId || ('CUSTOM-' + Date.now().toString(36)),
      supplier: existingProduct?.supplier || 'Partenaire',
      shipping: existingProduct?.shipping || '5-10 jours ouvres',
      name,
      shortDesc,
      details: details || name,
      price,
      oldPrice: Number.isFinite(oldPrice) && oldPrice > 0 ? oldPrice : null,
      category,
      badge,
      optionLabel,
      options,
      imageSrc
    };

    if (serverAdminAvailable) {
      try {
        let data;
        if (!editingProductId) {
          data = await adminApi('/api/admin/products', 'POST', productPayload);
        } else if (editingProductMode === 'default') {
          data = await adminApi('/api/admin/default-products/' + encodeURIComponent(editingProductId), 'PUT', productPayload);
        } else {
          data = await adminApi('/api/admin/products/' + encodeURIComponent(editingProductId), 'PUT', productPayload);
        }
        applyContentState(data);
      } catch (error) {
        showAdminFeedback('Impossible d\'enregistrer le produit côté serveur.', 'err');
        return;
      }
    } else {
      if (editingProductId && editingProductMode === 'default') {
        defaultProductOverridesState[editingProductId] = {
          ...defaultProductOverridesState[editingProductId],
          ...productPayload
        };
      } else if (editingProductId) {
        customProductsState = customProductsState.map((item) => item.id === editingProductId ? { ...item, ...productPayload } : item);
      } else {
        customProductsState = customProductsState.concat(productPayload);
      }
      persistStateToLocalStorage();
    }

    applyDefaultOverridesOnPublicPages();
    renderAdminLists();
    showAdminFeedback(editingProductId ? 'Produit modifié.' : 'Produit ajouté. Il apparaîtra dans la boutique.', 'ok');
    resetProductForm();
  });

  const addRealBtn = document.getElementById('admin-add-real');
  addRealBtn?.addEventListener('click', async () => {
    const title = realTitleInput?.value?.trim() || '';
    const style = realStyleInput?.value?.trim() || 'Flash custom';
    const imageUrl = realImageUrlInput?.value?.trim() || '';
    const imageFile = realImageFileInput?.files?.[0] || null;

    if (!title) {
      showAdminFeedback('Réalisation: le titre est requis.', 'err');
      return;
    }

    const existingReal = editingRealId
      ? (editingRealMode === 'default'
        ? getMergedDefaultRealisation(editingRealId)
        : customRealisationsState.find((item) => item.id === editingRealId))
      : null;

    let imageSrc = imageUrl || (existingReal?.imageSrc || '');
    if (!imageSrc && imageFile) {
      try {
        imageSrc = await readFileAsDataUrl(imageFile);
      } catch (error) {
        showAdminFeedback('Impossible de lire l\'image sélectionnée.', 'err');
        return;
      }
    }

    const realPayload = {
      id: editingRealId || ('real-' + Date.now().toString(36)),
      title,
      style,
      imageSrc
    };

    if (serverAdminAvailable) {
      try {
        let data;
        if (!editingRealId) {
          data = await adminApi('/api/admin/realisations', 'POST', realPayload);
        } else if (editingRealMode === 'default') {
          data = await adminApi('/api/admin/default-realisations/' + encodeURIComponent(editingRealId), 'PUT', realPayload);
        } else {
          data = await adminApi('/api/admin/realisations/' + encodeURIComponent(editingRealId), 'PUT', realPayload);
        }
        applyContentState(data);
      } catch (error) {
        showAdminFeedback('Impossible d\'enregistrer la réalisation côté serveur.', 'err');
        return;
      }
    } else {
      if (editingRealId && editingRealMode === 'default') {
        defaultRealisationOverridesState[editingRealId] = {
          ...defaultRealisationOverridesState[editingRealId],
          ...realPayload
        };
      } else if (editingRealId) {
        customRealisationsState = customRealisationsState.map((item) => item.id === editingRealId ? { ...item, ...realPayload } : item);
      } else {
        customRealisationsState = customRealisationsState.concat(realPayload);
      }
      persistStateToLocalStorage();
    }

    applyDefaultOverridesOnPublicPages();
    renderAdminLists();
    showAdminFeedback(editingRealId ? 'Réalisation modifiée.' : 'Réalisation ajoutée. Elle apparaîtra dans la galerie.', 'ok');
    resetRealForm();
  });

  cancelProductEditBtn?.addEventListener('click', resetProductForm);
  cancelRealEditBtn?.addEventListener('click', resetRealForm);

  openScheduleModalBtn?.addEventListener('click', openScheduleModal);
  closeScheduleModalBtn?.addEventListener('click', closeScheduleModal);
  cancelScheduleModalBtn?.addEventListener('click', () => {
    closeScheduleModal();
    resetScheduleForm();
  });

  scheduleModal?.addEventListener('click', (event) => {
    if (event.target === scheduleModal) closeScheduleModal();
  });

  scheduleDateInput?.addEventListener('change', () => {
    renderScheduleExistingForSlot(scheduleDateInput.value, scheduleTimeInput?.value || '');
    renderScheduleOverlapWarning();
  });

  scheduleTimeInput?.addEventListener('change', () => {
    renderScheduleExistingForSlot(scheduleDateInput?.value || '', scheduleTimeInput.value);
    renderScheduleOverlapWarning();
  });

  scheduleDurationInput?.addEventListener('change', () => {
    renderScheduleOverlapWarning();
  });

  schedulePlanner?.addEventListener('click', (event) => {
    const daySummary = event.target instanceof HTMLElement
      ? event.target.closest('.admin-mobile-day-summary')
      : null;
    if (daySummary) {
      const currentDay = daySummary.closest('.admin-mobile-day');
      if (currentDay) {
        requestAnimationFrame(() => {
          if (!currentDay.open) return;
          schedulePlanner.querySelectorAll('.admin-mobile-day[open]').forEach((item) => {
            if (item !== currentDay) item.open = false;
          });
        });
      }
      return;
    }

    const navButton = event.target instanceof HTMLElement
      ? event.target.closest('[data-schedule-week-nav]')
      : null;
    if (navButton) {
      const action = navButton.getAttribute('data-schedule-week-nav');
      const current = new Date((adminPlannerWeekStartState || '') + 'T00:00:00');
      const fallback = new Date();
      fallback.setHours(0, 0, 0, 0);
      const base = Number.isNaN(current.getTime()) ? fallback : current;

      if (action === 'today') {
        const today = new Date();
        const day = today.getDay();
        const diffToMonday = day === 0 ? -6 : 1 - day;
        today.setDate(today.getDate() + diffToMonday);
        today.setHours(0, 0, 0, 0);
        adminPlannerWeekStartState = toLocalDateKey(today);
      } else {
        base.setDate(base.getDate() + (action === 'prev' ? -7 : 7));
        adminPlannerWeekStartState = toLocalDateKey(base);
      }

      renderAdminSchedulePlanner();
      event.stopPropagation();
      return;
    }

    const scheduleEditChip = event.target instanceof HTMLElement
      ? event.target.closest('[data-schedule-edit]')
      : null;
    if (scheduleEditChip) {
      const scheduleEditId = scheduleEditChip.getAttribute('data-schedule-edit') || '';
      if (scheduleEditId) {
        openScheduleModalForEdit(scheduleEditId);
        event.stopPropagation();
      }
      return;
    }

    const cell = event.target instanceof HTMLElement
      ? event.target.closest('.admin-week-cell-clickable')
      : null;
    if (!cell) return;

    const dateValue = cell.getAttribute('data-schedule-date') || '';
    const hourValue = cell.getAttribute('data-schedule-hour') || '';
    if (!dateValue || !hourValue) return;

    openScheduleModal({ date: dateValue, time: hourValue });
    event.stopPropagation();
  });

  document.getElementById('admin-save-featured')?.addEventListener('click', async () => {
    const ids = Array.from(page.querySelectorAll('[data-featured-id]:checked'))
      .map((input) => input.dataset.featuredId)
      .filter(Boolean)
      .slice(0, 4);

    if (serverAdminAvailable) {
      try {
        const data = await adminApi('/api/admin/featured-realisations', 'PUT', { ids });
        applyContentState(data);
      } catch (error) {
        showAdminFeedback('Enregistrement des dernières réalisations impossible.', 'err');
        return;
      }
    } else {
      featuredRealisationsState = ids;
      persistStateToLocalStorage();
    }

    renderAdminLists();
    showAdminFeedback('Dernières réalisations mises à jour.', 'ok');
  });

  document.getElementById('admin-save-featured-products')?.addEventListener('click', async () => {
    const ids = Array.from(page.querySelectorAll('[data-featured-product-id]:checked'))
      .map((input) => input.dataset.featuredProductId)
      .filter(Boolean)
      .slice(0, 3);

    if (serverAdminAvailable) {
      try {
        const data = await adminApi('/api/admin/featured-products', 'PUT', { ids });
        applyContentState(data);
      } catch (error) {
        showAdminFeedback('Enregistrement des best-sellers impossible.', 'err');
        return;
      }
    } else {
      featuredProductsState = ids;
      persistStateToLocalStorage();
    }

    renderAdminLists();
    showAdminFeedback('Best-sellers mis a jour.', 'ok');
  });

  addScheduleBtn?.addEventListener('click', async () => {
    const clientName = scheduleClientInput?.value?.trim() || '';
    const date = scheduleDateInput?.value?.trim() || '';
    const time = scheduleTimeInput?.value?.trim() || '';
    const durationMin = Number(scheduleDurationInput?.value || 0);
    const status = scheduleStatusInput?.value?.trim() || 'en-attente';
    const note = scheduleNoteInput?.value?.trim() || '';

    if (!clientName || !date || !time) {
      showAdminFeedback('Planning: client, date et heure sont requis.', 'err');
      return;
    }

    const payload = {
      clientName,
      date,
      time,
      durationMin: Number.isFinite(durationMin) && durationMin > 0 ? durationMin : 120,
      status,
      note
    };
    if (serverAdminAvailable) {
      try {
        const data = editingScheduleId
          ? await adminApi('/api/admin/schedule/' + encodeURIComponent(editingScheduleId), 'PUT', payload)
          : await adminApi('/api/admin/schedule', 'POST', payload);
        applyContentState(data);
      } catch (error) {
        showAdminFeedback(editingScheduleId ? 'Mise a jour du planning impossible cote serveur.' : 'Ajout au planning impossible cote serveur.', 'err');
        return;
      }
    } else {
      if (editingScheduleId) {
        scheduleEntriesState = scheduleEntriesState.map((entry) => (
          entry.id === editingScheduleId
            ? { ...entry, ...payload }
            : entry
        ));
      } else {
        scheduleEntriesState = scheduleEntriesState.concat({ id: 'sch-' + Date.now().toString(36), ...payload });
      }
      persistStateToLocalStorage();
    }

    renderAdminLists();
    showAdminFeedback(editingScheduleId ? 'Créneau mis à jour.' : 'Créneau ajouté au planning.', 'ok');
    closeScheduleModal();
    resetScheduleForm();
  });

  deleteScheduleBtn?.addEventListener('click', async () => {
    if (!editingScheduleId) return;

    const confirmed = window.confirm('Supprimer ce créneau ? Cette action est irréversible.');
    if (!confirmed) return;

    const scheduleId = editingScheduleId;

    if (serverAdminAvailable) {
      try {
        const data = await adminApi('/api/admin/schedule/' + encodeURIComponent(scheduleId), 'DELETE');
        applyContentState(data);
      } catch (error) {
        showAdminFeedback('Suppression planning impossible côté serveur.', 'err');
        return;
      }
    } else {
      scheduleEntriesState = scheduleEntriesState.filter((entry) => entry.id !== scheduleId);
      persistStateToLocalStorage();
    }

    renderAdminLists();
    showAdminFeedback('Créneau supprimé.', 'ok');
    closeScheduleModal();
    resetScheduleForm();
  });

  page.addEventListener('click', async (event) => {
    const scheduleEditTarget = event.target instanceof HTMLElement
      ? event.target.closest('[data-schedule-edit]')
      : null;
    const removeProductId = event.target?.dataset?.removeProduct;
    const removeRealId = event.target?.dataset?.removeReal;
    const editProductId = event.target?.dataset?.editProduct;
    const editRealId = event.target?.dataset?.editReal;
    const editDefaultProductId = event.target?.dataset?.editDefaultProduct;
    const editDefaultRealId = event.target?.dataset?.editDefaultReal;
    const toggleDefaultProductId = event.target?.dataset?.toggleDefaultProduct;
    const toggleDefaultRealId = event.target?.dataset?.toggleDefaultReal;
    const orderSaveId = event.target?.dataset?.orderSave;
    const orderDispatchId = event.target?.dataset?.orderDispatch;
    const scheduleDeleteId = event.target?.dataset?.scheduleDelete;
    const scheduleStatusId = event.target?.dataset?.scheduleStatus;
    const scheduleEditId = scheduleEditTarget?.dataset?.scheduleEdit;

    if (orderDispatchId) {
      if (!serverAdminAvailable) {
        showAdminFeedback('Le suivi commandes nécessite le serveur actif.', 'err');
        return;
      }

      try {
        await adminApi('/api/admin/orders/' + encodeURIComponent(orderDispatchId) + '/dispatch', 'POST');
        await loadAdminOrders();
        showAdminFeedback('Relance fournisseur effectuée.', 'ok');
      } catch (error) {
        showAdminFeedback('Relance fournisseur impossible.', 'err');
      }
      return;
    }

    if (orderSaveId) {
      if (!serverAdminAvailable) {
        showAdminFeedback('Le suivi commandes nécessite le serveur actif.', 'err');
        return;
      }

      const statusInput = page.querySelector('[data-order-status="' + orderSaveId + '"]');
      const trackingInput = page.querySelector('[data-order-tracking="' + orderSaveId + '"]');
      const noteInput = page.querySelector('[data-order-note="' + orderSaveId + '"]');
      const isDispatched = statusInput?.dataset?.orderDispatched === '1';
      const wantedStatus = String(statusInput?.value || 'paid').toLowerCase();

      if ((wantedStatus === 'fulfilled' || wantedStatus === 'delivered') && !isDispatched) {
        showAdminFeedback('Envoi manuel TAT-EU requis avant statut Expediee/Livree.', 'err');
        return;
      }

      const payload = {
        status: statusInput?.value || 'paid',
        trackingNumber: trackingInput?.value?.trim() || '',
        adminNote: noteInput?.value?.trim() || ''
      };

      try {
        await adminApi('/api/admin/orders/' + encodeURIComponent(orderSaveId) + '/status', 'PUT', payload);
        await loadAdminOrders();
        showAdminFeedback('Commande mise à jour.', 'ok');
      } catch (error) {
        showAdminFeedback(String(error?.message || 'Mise à jour commande impossible côté serveur.'), 'err');
      }
      return;
    }

    if (editDefaultProductId) {
      const item = getMergedDefaultProduct(editDefaultProductId);
      if (!item) return;

      editingProductId = item.id;
      editingProductMode = 'default';
      if (productFormTitle) productFormTitle.textContent = 'Modifier un produit du site';
      if (addProductBtn) addProductBtn.textContent = 'Enregistrer le produit';
      if (cancelProductEditBtn) cancelProductEditBtn.style.display = 'inline-flex';

      if (productNameInput) productNameInput.value = item.name || '';
      if (productShortInput) productShortInput.value = item.shortDesc || '';
      if (productPriceInput) productPriceInput.value = String(item.price || '');
      if (productOldPriceInput) productOldPriceInput.value = item.oldPrice ? String(item.oldPrice) : '';
      if (productCategoryInput) productCategoryInput.value = item.category || 'modeles';
      if (productBadgeInput) productBadgeInput.value = item.badge || '';
      if (productOptionLabelInput) productOptionLabelInput.value = item.optionLabel || '';
      if (productOptionsInput) productOptionsInput.value = item.options || '';
      if (productDetailsInput) productDetailsInput.value = item.details || '';
      if (productImageUrlInput) productImageUrlInput.value = item.imageSrc || '';
      if (productImageFileInput) productImageFileInput.value = '';
      return;
    }

    if (editDefaultRealId) {
      const item = getMergedDefaultRealisation(editDefaultRealId);
      if (!item) return;

      editingRealId = item.id;
      editingRealMode = 'default';
      if (realFormTitle) realFormTitle.textContent = 'Modifier une réalisation du site';
      if (addRealBtn) addRealBtn.textContent = 'Enregistrer la réalisation';
      if (cancelRealEditBtn) cancelRealEditBtn.style.display = 'inline-flex';

      if (realTitleInput) realTitleInput.value = item.title || '';
      if (realStyleInput) realStyleInput.value = item.style || 'Flash custom';
      if (realImageUrlInput) realImageUrlInput.value = item.imageSrc || '';
      if (realImageFileInput) realImageFileInput.value = '';
      return;
    }

    if (editProductId) {
      const item = customProductsState.find((entry) => entry.id === editProductId);
      if (!item) return;

      editingProductId = item.id;
      editingProductMode = 'custom';
      if (productFormTitle) productFormTitle.textContent = 'Modifier un produit';
      if (addProductBtn) addProductBtn.textContent = 'Enregistrer le produit';
      if (cancelProductEditBtn) cancelProductEditBtn.style.display = 'inline-flex';

      if (productNameInput) productNameInput.value = item.name || '';
      if (productShortInput) productShortInput.value = item.shortDesc || '';
      if (productPriceInput) productPriceInput.value = String(item.price || '');
      if (productOldPriceInput) productOldPriceInput.value = item.oldPrice ? String(item.oldPrice) : '';
      if (productCategoryInput) productCategoryInput.value = item.category || 'modeles';
      if (productBadgeInput) productBadgeInput.value = item.badge || '';
      if (productOptionLabelInput) productOptionLabelInput.value = item.optionLabel || '';
      if (productOptionsInput) productOptionsInput.value = item.options || '';
      if (productDetailsInput) productDetailsInput.value = item.details || '';
      if (productImageUrlInput) productImageUrlInput.value = item.imageSrc || '';
      if (productImageFileInput) productImageFileInput.value = '';
      return;
    }

    if (editRealId) {
      const item = customRealisationsState.find((entry) => entry.id === editRealId);
      if (!item) return;

      editingRealId = item.id;
      editingRealMode = 'custom';
      if (realFormTitle) realFormTitle.textContent = 'Modifier une réalisation';
      if (addRealBtn) addRealBtn.textContent = 'Enregistrer la réalisation';
      if (cancelRealEditBtn) cancelRealEditBtn.style.display = 'inline-flex';

      if (realTitleInput) realTitleInput.value = item.title || '';
      if (realStyleInput) realStyleInput.value = item.style || 'Flash custom';
      if (realImageUrlInput) realImageUrlInput.value = item.imageSrc || '';
      if (realImageFileInput) realImageFileInput.value = '';
      return;
    }

    if (removeProductId) {
      if (serverAdminAvailable) {
        try {
          const data = await adminApi('/api/admin/products/' + encodeURIComponent(removeProductId), 'DELETE');
          applyContentState(data);
        } catch (error) {
          showAdminFeedback('Suppression serveur impossible.', 'err');
          return;
        }
      } else {
        customProductsState = customProductsState.filter((item) => item.id !== removeProductId);
        persistStateToLocalStorage();
      }
      renderAdminLists();
      showAdminFeedback('Produit supprimé.', 'ok');
    }

    if (removeRealId) {
      if (serverAdminAvailable) {
        try {
          const data = await adminApi('/api/admin/realisations/' + encodeURIComponent(removeRealId), 'DELETE');
          applyContentState(data);
        } catch (error) {
          showAdminFeedback('Suppression serveur impossible.', 'err');
          return;
        }
      } else {
        customRealisationsState = customRealisationsState.filter((item) => item.id !== removeRealId);
        persistStateToLocalStorage();
      }
      renderAdminLists();
      showAdminFeedback('Réalisation supprimée.', 'ok');
    }

    if (toggleDefaultProductId) {
      if (serverAdminAvailable) {
        try {
          const data = await adminApi('/api/admin/default-products/' + encodeURIComponent(toggleDefaultProductId) + '/toggle', 'POST');
          applyContentState(data);
        } catch (error) {
          showAdminFeedback('Action serveur impossible.', 'err');
          return;
        }
      } else {
        const exists = hiddenDefaultProductsState.includes(toggleDefaultProductId);
        hiddenDefaultProductsState = exists
          ? hiddenDefaultProductsState.filter((id) => id !== toggleDefaultProductId)
          : hiddenDefaultProductsState.concat(toggleDefaultProductId);
        persistStateToLocalStorage();
      }

      const exists = hiddenDefaultProductsState.includes(toggleDefaultProductId);
      renderAdminLists();
      showAdminFeedback(exists ? 'Produit masqué sur la boutique.' : 'Produit restauré sur la boutique.', 'ok');
    }

    if (toggleDefaultRealId) {
      if (serverAdminAvailable) {
        try {
          const data = await adminApi('/api/admin/default-realisations/' + encodeURIComponent(toggleDefaultRealId) + '/toggle', 'POST');
          applyContentState(data);
        } catch (error) {
          showAdminFeedback('Action serveur impossible.', 'err');
          return;
        }
      } else {
        const exists = hiddenDefaultRealisationsState.includes(toggleDefaultRealId);
        hiddenDefaultRealisationsState = exists
          ? hiddenDefaultRealisationsState.filter((id) => id !== toggleDefaultRealId)
          : hiddenDefaultRealisationsState.concat(toggleDefaultRealId);
        persistStateToLocalStorage();
      }

      const exists = hiddenDefaultRealisationsState.includes(toggleDefaultRealId);
      renderAdminLists();
      showAdminFeedback(exists ? 'Réalisation masquée dans la galerie.' : 'Réalisation restaurée dans la galerie.', 'ok');
    }

    if (scheduleDeleteId) {
      if (serverAdminAvailable) {
        try {
          const data = await adminApi('/api/admin/schedule/' + encodeURIComponent(scheduleDeleteId), 'DELETE');
          applyContentState(data);
        } catch (error) {
          showAdminFeedback('Suppression planning impossible côté serveur.', 'err');
          return;
        }
      } else {
        scheduleEntriesState = scheduleEntriesState.filter((entry) => entry.id !== scheduleDeleteId);
        persistStateToLocalStorage();
      }
      renderAdminLists();
      showAdminFeedback('Entrée planning supprimée.', 'ok');
    }

    if (scheduleStatusId) {
      const entry = scheduleEntriesState.find((item) => item.id === scheduleStatusId);
      if (!entry) return;

      const payload = { ...entry, status: 'confirme' };
      if (serverAdminAvailable) {
        try {
          const data = await adminApi('/api/admin/schedule/' + encodeURIComponent(scheduleStatusId), 'PUT', payload);
          applyContentState(data);
        } catch (error) {
          showAdminFeedback('Mise à jour planning impossible côté serveur.', 'err');
          return;
        }
      } else {
        scheduleEntriesState = scheduleEntriesState.map((item) => item.id === scheduleStatusId ? { ...item, status: 'confirme' } : item);
        persistStateToLocalStorage();
      }
      renderAdminLists();
      showAdminFeedback('Créneau confirmé.', 'ok');
    }

    if (scheduleEditId) {
      openScheduleModalForEdit(scheduleEditId);
    }
  });

  document.getElementById('admin-clear-products')?.addEventListener('click', async () => {
    if (serverAdminAvailable) {
      try {
        const data = await adminApi('/api/admin/custom-products/clear', 'POST');
        applyContentState(data);
      } catch (error) {
        showAdminFeedback('Action serveur impossible.', 'err');
        return;
      }
    } else {
      customProductsState = [];
      persistStateToLocalStorage();
    }
    renderAdminLists();
    showAdminFeedback('Produits personnalisés supprimés.', 'ok');
  });

  document.getElementById('admin-clear-reals')?.addEventListener('click', async () => {
    if (serverAdminAvailable) {
      try {
        const data = await adminApi('/api/admin/custom-realisations/clear', 'POST');
        applyContentState(data);
      } catch (error) {
        showAdminFeedback('Action serveur impossible.', 'err');
        return;
      }
    } else {
      customRealisationsState = [];
      persistStateToLocalStorage();
    }
    renderAdminLists();
    showAdminFeedback('Réalisations personnalisées supprimées.', 'ok');
  });

  document.getElementById('admin-restore-default-products')?.addEventListener('click', async () => {
    if (serverAdminAvailable) {
      try {
        const data = await adminApi('/api/admin/default-products/restore-all', 'POST');
        applyContentState(data);
      } catch (error) {
        showAdminFeedback('Action serveur impossible.', 'err');
        return;
      }
    } else {
      hiddenDefaultProductsState = [];
      persistStateToLocalStorage();
    }
    renderAdminLists();
    showAdminFeedback('Tous les produits par défaut ont été restaurés.', 'ok');
  });

  document.getElementById('admin-restore-default-reals')?.addEventListener('click', async () => {
    if (serverAdminAvailable) {
      try {
        const data = await adminApi('/api/admin/default-realisations/restore-all', 'POST');
        applyContentState(data);
      } catch (error) {
        showAdminFeedback('Action serveur impossible.', 'err');
        return;
      }
    } else {
      hiddenDefaultRealisationsState = [];
      persistStateToLocalStorage();
    }
    renderAdminLists();
    showAdminFeedback('Toutes les réalisations par défaut ont été restaurées.', 'ok');
  });
}

function rememberFocus() {
  if (document.activeElement instanceof HTMLElement) {
    lastFocusedElement = document.activeElement;
  }
}

function restoreFocus() {
  if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
    lastFocusedElement.focus();
  }
  lastFocusedElement = null;
}

function makeCardsKeyboardAccessible() {
  document.querySelectorAll('.mini-cell, .real-cell, .product').forEach((card) => {
    if (card.dataset.keyboardBound === '1') return;
    card.dataset.keyboardBound = '1';

    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');

    if (!card.getAttribute('aria-label')) {
      const label = card.querySelector('h3')?.textContent?.trim()
        || card.querySelector('.cell-title')?.textContent?.trim()
        || card.querySelector('img')?.alt
        || 'Ouvrir le détail';
      card.setAttribute('aria-label', label);
    }

    card.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      card.click();
    });
  });
}

async function initDynamicContent() {
  await refreshContentState();
  applyDefaultOverridesOnPublicPages();
  applyFeaturedRealisationsOnHome();
  applyFeaturedProductsOnHome();
  renderCustomProducts();
  renderCustomRealisations();
  bindGalleryCells();
  bindProductCards();
  makeCardsKeyboardAccessible();
}

function openLightbox(src, alt) {
  if (!lightbox || !lightboxImage) return;
  rememberFocus();
  lightboxImage.src = src;
  lightboxImage.alt = alt || 'Tatouage';
  lightbox.classList.add('open');
  lightbox.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  lightboxClose?.focus();
}

function closeLightbox() {
  if (!lightbox || !lightboxImage) return;
  lightbox.classList.remove('open');
  lightbox.setAttribute('aria-hidden', 'true');
  lightboxImage.src = '';
  document.body.style.overflow = '';
  restoreFocus();
}

bindGalleryCells();

if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);

if (lightbox) {
  lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox) closeLightbox();
  });
}



const CART_KEY = 'chiino_cart_v1';
const floatingCartBtn = document.getElementById('floating-cart');
const closeCartBtn = document.getElementById('close-cart');
const cartDrawer = document.getElementById('cart-drawer');
const cartItemsEl = document.getElementById('cart-items');
const cartTotalEl = document.getElementById('cart-total');
const cartCountEl = document.getElementById('cart-count');
const checkoutBtn = document.getElementById('checkout-btn');
const clearCartBtn = document.getElementById('clear-cart');
const depositBtn = document.getElementById('deposit-btn');
const productModal = document.getElementById('product-modal');
const productModalClose = document.getElementById('product-modal-close');
const productModalImage = document.getElementById('product-modal-image');
const productModalBadge = document.getElementById('product-modal-badge');
const productModalTitle = document.getElementById('product-modal-title');
const productModalDesc = document.getElementById('product-modal-desc');
const productModalPrice = document.getElementById('product-modal-price');
const productModalOptionWrap = document.getElementById('product-modal-option-wrap');
const productModalOptionLabel = document.getElementById('product-modal-option-label');
const productModalOption = document.getElementById('product-modal-option');
const productModalAdd = document.getElementById('product-modal-add');
const depositFeedback = document.getElementById('deposit-feedback');
const reservationPrenomInput = document.getElementById('reservation-prenom');
const reservationNomInput = document.getElementById('reservation-nom');
const reservationTelephoneInput = document.getElementById('reservation-telephone');
const reservationStyleInput = document.getElementById('reservation-style');
const reservationZoneInput = document.getElementById('reservation-zone');
const reservationDayInput = document.getElementById('reservation-day');
const reservationPeriodInput = document.getElementById('reservation-period');
const reservationDisponibilitesInput = document.getElementById('reservation-disponibilites');
const reservationImagesInput = document.getElementById('reservation-images');
const reservationImagesHint = document.getElementById('reservation-images-hint');
const reservationDescriptionInput = document.getElementById('reservation-description');
const reservationOpenSlotPickerBtn = document.getElementById('reservation-open-slot-picker');
const reservationSlotModal = document.getElementById('reservation-slot-modal');
const reservationSlotCloseBtn = document.getElementById('reservation-slot-close');
const reservationSlotCancelBtn = document.getElementById('reservation-slot-cancel');
const reservationSlotConfirmBtn = document.getElementById('reservation-slot-confirm');
const reservationSlotGrid = document.getElementById('reservation-slot-grid');
const reservationSlotWeekLabel = document.getElementById('reservation-slot-week-label');
const reservationSlotPrevBtn = document.getElementById('reservation-slot-prev');
const reservationSlotNextBtn = document.getElementById('reservation-slot-next');
const reservationSlotHint = document.getElementById('reservation-slot-hint');
const reservationSlotSelectedLabel = document.getElementById('reservation-slot-selected');

let cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
// Correction Stripe : rendre stripeItems global pour le paiement
let stripeItems = [];
let stripeClientPromise = undefined;
let shopPaymentElements = null;
let shopPaymentStripe = null;
let shopPaymentConfirmHandler = null;
let reservationPickerWeekStart = null;
let reservationSelectedSlot = null;
let reservationDraftSlot = null;
let reservationOccupiedSlots = new Set();
document.addEventListener('keydown', (event) => {
  const stripeEmbedded = document.getElementById('stripe-embedded-payment');
  if (event.key === 'Escape' && stripeEmbedded && stripeEmbedded.classList.contains('open')) {
    stripeEmbedded.querySelector('#stripe-embedded-close')?.click();
    return;
  }
  if (event.key === 'Escape' && reservationSlotModal && reservationSlotModal.classList.contains('open')) {
    closeReservationSlotModal();
    return;
  }
  if (event.key === 'Escape' && productModal && productModal.classList.contains('open')) {
    closeProductModal();
    return;
  }
  if (event.key === 'Escape' && lightbox && lightbox.classList.contains('open')) {
    closeLightbox();
  }
});


// Nouvelle version simple de getStripeClient
async function getStripeClient() {
  if (stripeClientPromise) return stripeClientPromise;
  // Charge Stripe.js si ce n'est pas déjà fait
  if (!window.Stripe) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  // Récupère la clé publique Stripe depuis le backend
  const response = await fetch('/api/public-config');
  const data = await response.json();
  if (!data.publishableKey) return null;
  stripeClientPromise = window.Stripe(data.publishableKey);
  return stripeClientPromise;
}

async function startStripeCheckout(endpoint, payload) {
  const stripe = await getStripeClient();
  if (!stripe) return { ok: false, reason: 'no-stripe-client' };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {})
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.sessionId) {
    return { ok: false, reason: data.error || 'session-error' };
  }

  const redirect = await stripe.redirectToCheckout({ sessionId: data.sessionId });
  if (redirect && redirect.error) {
    return { ok: false, reason: redirect.error.message || 'redirect-error' };
  }

  return { ok: true };
}

async function createStripePaymentIntent(payload) {
  const response = await fetch('/api/create-payment-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {})
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.clientSecret) {
    return { ok: false, reason: data.error || 'payment-intent-error' };
  }

  return {
    ok: true,
    clientSecret: data.clientSecret,
    amount: Number(data.amount || 0),
    orderRef: String(data.orderRef || '')
  };
}

function ensureShopPaymentDom() {
  let modal = document.getElementById('stripe-embedded-payment');
  if (modal) return modal;

  modal = document.createElement('div');
  modal.id = 'stripe-embedded-payment';
  modal.className = 'stripe-embedded-payment';
  modal.setAttribute('aria-hidden', 'true');
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Paiement sécurisé');
  modal.setAttribute('tabindex', '-1');
  modal.innerHTML =
    '<div class="stripe-embedded-card">' +
      '<div class="stripe-embedded-head">' +
        '<strong>Paiement sécurisé <span style="color:#2196f3;font-size:1.2em;vertical-align:middle;">•</span></strong>' +
        '<button id="stripe-embedded-close" class="stripe-embedded-close" aria-label="Fermer">x</button>' +
      '</div>' +
      '<div class="stripe-embedded-body">' +
        '<p id="stripe-embedded-note" class="stripe-embedded-note">Finalise ton paiement sans quitter la boutique.</p>' +
        '<p id="stripe-embedded-order" class="stripe-embedded-order"></p>' +
        '<div id="stripe-embedded-step-info" class="stripe-embedded-step">' +
          '<div class="stripe-embedded-customer">' +
            '<div class="fg"><label for="stripe-embedded-customer-first-name">Prenom</label><input id="stripe-embedded-customer-first-name" type="text" placeholder="Ex: Lea"></div>' +
            '<div class="fg"><label for="stripe-embedded-customer-last-name">Nom</label><input id="stripe-embedded-customer-last-name" type="text" placeholder="Ex: Martin"></div>' +
            '<div class="fg"><label for="stripe-embedded-customer-address">Adresse</label><input id="stripe-embedded-customer-address" type="text" placeholder="Ex: 12 rue des Fleurs"></div>' +
            '<div class="fg"><label for="stripe-embedded-customer-postal">Code postal</label><input id="stripe-embedded-customer-postal" type="text" placeholder="Ex: 67000"></div>' +
            '<div class="fg"><label for="stripe-embedded-customer-city">Ville</label><input id="stripe-embedded-customer-city" type="text" placeholder="Ex: Strasbourg"></div>' +
            '<div class="fg"><label for="stripe-embedded-customer-country">Pays</label><select id="stripe-embedded-customer-country"><option value="" disabled selected>Choisir un pays</option><option value="FR">France</option><option value="BE">Belgique</option><option value="CH">Suisse</option><option value="LU">Luxembourg</option><option value="DE">Allemagne</option><option value="ES">Espagne</option><option value="IT">Italie</option><option value="CA">Canada</option><option value="US">Etats-Unis</option></select></div>' +
            '<div class="fg"><label for="stripe-embedded-customer-email">Email</label><input id="stripe-embedded-customer-email" type="email" placeholder="exemple@email.com"></div>' +
            '<div class="fg"><label for="stripe-embedded-customer-phone">Telephone (optionnel)</label><input id="stripe-embedded-customer-phone" type="tel" placeholder="06 12 34 56 78"></div>' +
          '</div>' +
          '<div class="stripe-embedded-actions">' +
            '<button id="stripe-embedded-cancel-info" class="add-btn">Retour</button>' +
            '<button id="stripe-embedded-next" class="btn-pay">Continuer</button>' +
          '</div>' +
        '</div>' +
        '<div id="stripe-embedded-step-payment" class="stripe-embedded-step stripe-embedded-step-hidden">' +
          '<div id="stripe-embedded-element" class="stripe-embedded-element"></div>' +
          '<div class="stripe-embedded-actions">' +
            '<button id="stripe-embedded-back-to-info" class="add-btn">Infos</button>' +
            '<button id="stripe-embedded-pay" class="btn-pay">Payer maintenant</button>' +
          '</div>' +
        '</div>' +
        '<p id="stripe-embedded-error" class="stripe-embedded-error" aria-live="polite"></p>' +
      '</div>' +
    '</div>';

  document.body.appendChild(modal);

  const close = () => {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    shopPaymentConfirmHandler = null;
    if (shopPaymentElements && typeof shopPaymentElements.getElement === 'function') {
      const element = shopPaymentElements.getElement('payment');
      if (element) element.unmount();
    }
    shopPaymentElements = null;
    shopPaymentStripe = null;
    document.body.style.overflow = '';
    restoreFocus();
  };

  modal.addEventListener('click', (event) => {
    if (event.target === modal) close();
  });

  modal.querySelector('#stripe-embedded-close')?.addEventListener('click', close);
  modal.querySelector('#stripe-embedded-cancel-info')?.addEventListener('click', close);
  modal.querySelector('#stripe-embedded-pay')?.addEventListener('click', async () => {
    if (typeof shopPaymentConfirmHandler === 'function') {
      await shopPaymentConfirmHandler();
    }
  });

  return modal;
}

async function openEmbeddedStripePayment(options) {
  const stripe = await getStripeClient();
  if (!stripe) return { ok: false, reason: 'no-stripe-client' };

  const modal = ensureShopPaymentDom();
  const elementWrap = modal.querySelector('#stripe-embedded-element');
  const errorEl = modal.querySelector('#stripe-embedded-error');
  const orderEl = modal.querySelector('#stripe-embedded-order');
  const payBtn = modal.querySelector('#stripe-embedded-pay');
  const nextBtn = modal.querySelector('#stripe-embedded-next');
  const backToInfoBtn = modal.querySelector('#stripe-embedded-back-to-info');
  const infoStep = modal.querySelector('#stripe-embedded-step-info');
  const paymentStep = modal.querySelector('#stripe-embedded-step-payment');
  const customerFirstNameInput = modal.querySelector('#stripe-embedded-customer-first-name');
  const customerLastNameInput = modal.querySelector('#stripe-embedded-customer-last-name');
  const customerAddressInput = modal.querySelector('#stripe-embedded-customer-address');
  const customerPostalInput = modal.querySelector('#stripe-embedded-customer-postal');
  const customerCityInput = modal.querySelector('#stripe-embedded-customer-city');
  const customerCountryInput = modal.querySelector('#stripe-embedded-customer-country');
  const customerEmailInput = modal.querySelector('#stripe-embedded-customer-email');
  const customerPhoneInput = modal.querySelector('#stripe-embedded-customer-phone');

  rememberFocus();
  if (errorEl) errorEl.textContent = '';
  if (orderEl) orderEl.textContent = options.orderRef ? ('Reference: ' + options.orderRef) : '';

  if (customerFirstNameInput && !customerFirstNameInput.value) {
    customerFirstNameInput.value = localStorage.getItem('chiino_checkout_customer_first_name') || '';
  }
  if (customerLastNameInput && !customerLastNameInput.value) {
    customerLastNameInput.value = localStorage.getItem('chiino_checkout_customer_last_name') || '';
  }
  if (customerAddressInput && !customerAddressInput.value) {
    customerAddressInput.value = localStorage.getItem('chiino_checkout_customer_address') || '';
  }
  if (customerPostalInput && !customerPostalInput.value) {
    customerPostalInput.value = localStorage.getItem('chiino_checkout_customer_postal') || '';
  }
  if (customerCityInput && !customerCityInput.value) {
    customerCityInput.value = localStorage.getItem('chiino_checkout_customer_city') || '';
  }
  if (customerCountryInput && !customerCountryInput.value) {
    customerCountryInput.value = localStorage.getItem('chiino_checkout_customer_country') || '';
  }
  if (customerEmailInput && !customerEmailInput.value) {
    customerEmailInput.value = localStorage.getItem('chiino_checkout_customer_email') || '';
  }
  if (customerPhoneInput && !customerPhoneInput.value) {
    customerPhoneInput.value = localStorage.getItem('chiino_checkout_customer_phone') || '';
  }

  if (infoStep && paymentStep) {
    infoStep.classList.remove('stripe-embedded-step-hidden');
    paymentStep.classList.add('stripe-embedded-step-hidden');
  }

  shopPaymentStripe = stripe;
  shopPaymentElements = stripe.elements({
    clientSecret: options.clientSecret,
    appearance: { theme: 'night' }
  });

  const paymentElement = shopPaymentElements.create('payment');
  paymentElement.mount(elementWrap);

  const getCustomerDetails = () => {
    const customerFirstName = String(customerFirstNameInput?.value || '').trim();
    const customerLastName = String(customerLastNameInput?.value || '').trim();
    const customerAddress = String(customerAddressInput?.value || '').trim();
    const customerPostal = String(customerPostalInput?.value || '').trim();
    const customerCity = String(customerCityInput?.value || '').trim();
    const customerCountry = String(customerCountryInput?.value || '').trim().toUpperCase();
    const customerEmail = String(customerEmailInput?.value || '').trim();
    const customerPhone = String(customerPhoneInput?.value || '').trim();
    const customerName = [customerFirstName, customerLastName].filter(Boolean).join(' ').trim();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail);
    const postalOk = /^[A-Za-z0-9\s-]{3,12}$/.test(customerPostal);
    const requiredMissing = !customerFirstName || !customerLastName || !customerAddress || !postalOk || !customerCity || !customerCountry || !emailOk;

    return {
      customerFirstName,
      customerLastName,
      customerAddress,
      customerPostal,
      customerCity,
      customerCountry,
      customerEmail,
      customerPhone,
      customerName,
      requiredMissing
    };
  };

  nextBtn.onclick = () => {
    const details = getCustomerDetails();

    if (details.requiredMissing) {
      if (errorEl) errorEl.textContent = 'Merci de renseigner prenom, nom, adresse, code postal, ville, pays et un email valide avant paiement.';
      return;
    }

    localStorage.setItem('chiino_checkout_customer_first_name', details.customerFirstName);
    localStorage.setItem('chiino_checkout_customer_last_name', details.customerLastName);
    localStorage.setItem('chiino_checkout_customer_address', details.customerAddress);
    localStorage.setItem('chiino_checkout_customer_postal', details.customerPostal);
    localStorage.setItem('chiino_checkout_customer_city', details.customerCity);
    localStorage.setItem('chiino_checkout_customer_country', details.customerCountry);
    localStorage.setItem('chiino_checkout_customer_email', details.customerEmail);
    localStorage.setItem('chiino_checkout_customer_phone', details.customerPhone);

    if (errorEl) errorEl.textContent = '';
    if (infoStep && paymentStep) {
      infoStep.classList.add('stripe-embedded-step-hidden');
      paymentStep.classList.remove('stripe-embedded-step-hidden');
    }
  };

  backToInfoBtn.onclick = () => {
    if (errorEl) errorEl.textContent = '';
    if (infoStep && paymentStep) {
      paymentStep.classList.add('stripe-embedded-step-hidden');
      infoStep.classList.remove('stripe-embedded-step-hidden');
    }
  };

  shopPaymentConfirmHandler = async () => {
    if (!shopPaymentStripe || !shopPaymentElements) return;

    const details = getCustomerDetails();

    if (details.requiredMissing) {
      if (errorEl) errorEl.textContent = 'Merci de renseigner prenom, nom, adresse, code postal, ville, pays et un email valide avant paiement.';
      return;
    }

    localStorage.setItem('chiino_checkout_customer_first_name', details.customerFirstName);
    localStorage.setItem('chiino_checkout_customer_last_name', details.customerLastName);
    localStorage.setItem('chiino_checkout_customer_address', details.customerAddress);
    localStorage.setItem('chiino_checkout_customer_postal', details.customerPostal);
    localStorage.setItem('chiino_checkout_customer_city', details.customerCity);
    localStorage.setItem('chiino_checkout_customer_country', details.customerCountry);
    localStorage.setItem('chiino_checkout_customer_email', details.customerEmail);
    localStorage.setItem('chiino_checkout_customer_phone', details.customerPhone);

    if (payBtn) {
      payBtn.disabled = true;
      payBtn.textContent = 'Paiement en cours...';
    }
    if (errorEl) errorEl.textContent = '';

    // Log pour debug : vérifier l'email transmis à Stripe
    console.log('[Paiement] Email transmis à Stripe:', details.customerEmail);
    // On transmet le nom et l'email dans le PaymentIntent (metadata)
    const result = await createStripePaymentIntent({
      items: stripeItems,
      clientName: details.customerName,
      clientFirstName: details.customerFirstName,
      clientLastName: details.customerLastName,
      clientAddress: details.customerAddress,
      clientPostal: details.customerPostal,
      clientCity: details.customerCity,
      clientCountry: details.customerCountry,
      clientPhone: details.customerPhone,
      clientEmail: details.customerEmail
    });

    if (!result.ok) {
      if (errorEl) errorEl.textContent = 'Erreur lors de la création du paiement.';
      return;
    }

    const { error, paymentIntent } = await shopPaymentStripe.confirmPayment({
      elements: shopPaymentElements,
      payment_method_data: {
        billing_details: {
          name: details.customerName,
          email: details.customerEmail,
          address: {
            line1: details.customerAddress,
            postal_code: details.customerPostal,
            city: details.customerCity,
            country: details.customerCountry
          },
          phone: details.customerPhone || undefined
        }
      },
      confirmParams: {
        return_url: window.location.origin + '/boutique.html?payment=return'
      },
      redirect: 'if_required'
    });

    if (payBtn) {
      payBtn.disabled = false;
      payBtn.textContent = 'Payer maintenant';
    }

    if (error) {
      if (errorEl) errorEl.textContent = String(error.message || 'Paiement impossible, merci de réessayer.');
      return;
    }

    const status = String(paymentIntent?.status || '').toLowerCase();
    if (status === 'succeeded' || status === 'processing' || status === 'requires_capture') {
      cart = [];
      renderCart();
      closeCart();
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      alert('Paiement validé. La commande est enregistrée et disponible dans le back-office.');
      restoreFocus();
      return;
    }

    if (errorEl) errorEl.textContent = 'Paiement non confirmé pour le moment. Vérifie le statut dans Stripe.';
  };

  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  modal.querySelector('#stripe-embedded-pay')?.focus();
  return { ok: true };
}

function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function formatPrice(value) {
  return value.toFixed(2).replace('.', ',') + '€';
}

function toSlotKey(date, time) {
  return `${String(date || '')}T${String(time || '')}`;
}

function getMondayFromDate(date) {
  const monday = new Date(date);
  monday.setHours(0, 0, 0, 0);
  const day = monday.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  monday.setDate(monday.getDate() + diffToMonday);
  return monday;
}

function renderReservationSlotPicker() {
  if (!reservationSlotGrid || !reservationSlotWeekLabel) return;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const weekStart = reservationPickerWeekStart ? new Date(reservationPickerWeekStart) : getMondayFromDate(now);
  weekStart.setHours(0, 0, 0, 0);
  reservationPickerWeekStart = weekStart;

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  reservationSlotWeekLabel.textContent = `${weekStart.toLocaleDateString('fr-FR')} - ${weekEnd.toLocaleDateString('fr-FR')}`;

  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return {
      date,
      key: toLocalDateKey(date),
      label: date.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' })
    };
  });

  const hours = Array.from({ length: 11 }, (_, index) => String(9 + index).padStart(2, '0') + ':00');
  const header = '<div class="booking-slot-head booking-slot-hour"></div>' + days.map((d) => '<div class="booking-slot-head">' + escapeHtml(d.label) + '</div>').join('');
  const rows = hours.map((hour) => {
    const hourCell = '<div class="booking-slot-hour">' + hour + '</div>';
    const dayCells = days.map((day) => {
      const slotDate = day.key;
      const slotKey = toSlotKey(slotDate, hour);
      const isPast = new Date(slotDate + 'T' + hour + ':00').getTime() < Date.now();
      const occupied = reservationOccupiedSlots.has(slotKey) || isPast;
      const activeSelection = reservationDraftSlot || reservationSelectedSlot;
      const selected = activeSelection && activeSelection.date === slotDate && activeSelection.time === hour;
      const classes = [
        'booking-slot-cell',
        occupied ? 'is-occupied' : 'is-available',
        selected ? 'is-selected' : ''
      ].filter(Boolean).join(' ');
      const stateLabel = occupied ? 'Occupé' : 'Disponible';
      return '<button type="button" class="' + classes + '" data-slot-date="' + escapeHtml(slotDate) + '" data-slot-time="' + escapeHtml(hour) + '" ' + (occupied ? 'disabled' : '') + '><span>' + stateLabel + '</span></button>';
    }).join('');
    return hourCell + dayCells;
  }).join('');

  reservationSlotGrid.innerHTML = '<div class="booking-slot-table">' + header + rows + '</div>';

  const selection = reservationDraftSlot || reservationSelectedSlot;
  if (reservationSlotSelectedLabel) {
    reservationSlotSelectedLabel.textContent = selection
      ? ('Créneau sélectionné : ' + selection.date + ' à ' + selection.time)
      : 'Aucun créneau sélectionné.';
  }
  if (reservationSlotConfirmBtn) {
    reservationSlotConfirmBtn.disabled = !selection;
  }
}

async function loadReservationAvailability() {
  if (!reservationSlotGrid) return;

  if (!reservationPickerWeekStart) {
    reservationPickerWeekStart = getMondayFromDate(new Date());
  }

  try {
    const data = await fetchJson('/api/public-schedule-availability');
    const slots = Array.isArray(data.occupiedSlots) ? data.occupiedSlots : [];
    reservationOccupiedSlots = new Set(
      slots
        .map((slot) => ({
          date: String(slot.date || '').trim(),
          time: String(slot.time || '').trim()
        }))
        .filter((slot) => /^\d{4}-\d{2}-\d{2}$/.test(slot.date) && /^\d{2}:\d{2}$/.test(slot.time))
        .map((slot) => toSlotKey(slot.date, slot.time))
    );

    if (reservationSlotHint) {
      reservationSlotHint.textContent = 'Clique sur un créneau disponible. Les créneaux occupés ne sont pas sélectionnables.';
    }
  } catch (error) {
    reservationOccupiedSlots = new Set(
      scheduleEntriesState
        .map((entry) => ({ date: String(entry.date || '').trim(), time: String(entry.time || '').trim() }))
        .filter((entry) => /^\d{4}-\d{2}-\d{2}$/.test(entry.date) && /^\d{2}:\d{2}$/.test(entry.time))
        .map((entry) => toSlotKey(entry.date, entry.time))
    );
    if (reservationSlotHint) {
      reservationSlotHint.textContent = 'Planning indisponible en direct. Affichage basé sur les données locales.';
    }
  }

  renderReservationSlotPicker();
}

function closeReservationSlotModal() {
  if (!reservationSlotModal) return;
  reservationSlotModal.classList.remove('open');
  reservationSlotModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  reservationDraftSlot = null;
}

async function openReservationSlotModal() {
  if (!reservationSlotModal) return;

  await loadReservationAvailability();
  reservationDraftSlot = reservationSelectedSlot ? { ...reservationSelectedSlot } : null;
  renderReservationSlotPicker();

  reservationSlotModal.classList.add('open');
  reservationSlotModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  reservationSlotCloseBtn?.focus();
}

function getCartTotal() {
  return cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
}

function renderCart() {
  if (!cartItemsEl) return;

  if (cart.length === 0) {
    cartItemsEl.innerHTML = '<p style="font-size:12px;color:var(--muted)">Ton panier est vide.</p>';
  } else {
    cartItemsEl.innerHTML = cart.map((item, index) => (
      (() => {
        const optionText = item.optionValue
          ? (item.optionLabel || 'Option') + ': ' + item.optionValue + ' • '
          : '';
        const unitPriceText = formatPrice(item.price) + ' / unité';
        return '<div class="cart-item">' +
          '<div><strong>' + (item.baseName || item.name) + '</strong><span>' + optionText + unitPriceText + '</span></div>' +
          '<div class="cart-line-actions">' +
            '<button data-action="minus" data-index="' + index + '">-</button>' +
            '<span>' + item.qty + '</span>' +
            '<button data-action="plus" data-index="' + index + '">+</button>' +
          '</div>' +
        '</div>';
      })()
    )).join('');
  }

  cartTotalEl.textContent = formatPrice(getCartTotal());
  cartCountEl.textContent = cart.reduce((acc, item) => acc + item.qty, 0);
  saveCart();
}

function openCart() {
  if (!cartDrawer) return;
  rememberFocus();
  cartDrawer.classList.add('open');
  cartDrawer.setAttribute('aria-hidden', 'false');
  closeCartBtn?.focus();
}

function closeCart() {
  if (!cartDrawer) return;
  cartDrawer.classList.remove('open');
  cartDrawer.setAttribute('aria-hidden', 'true');
  restoreFocus();
}

function addToCart(product) {
  const existing = cart.find((item) => item.sku === product.sku);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ ...product, qty: 1 });
  }
  renderCart();
}

function getDisplayedPrice(productCard) {
  const displayedPrice = productCard.querySelector('.price')?.textContent || '';
  const raw = (displayedPrice || productCard.dataset.price || '')
    .replace('€', '')
    .replace('EUR', '')
    .replace(',', '.')
    .trim();
  return Number(raw);
}

let activeModalProduct = null;

function openProductModal(productCard) {
  if (!productModal) return;

  rememberFocus();
  activeModalProduct = productCard;
  const img = productCard.querySelector('.product-img img');
  const title = productCard.querySelector('h3')?.textContent?.trim() || 'Produit';
  const shortDesc = productCard.querySelector('.product-info p')?.textContent?.trim() || '';
  const longDesc = productCard.dataset.details || shortDesc;
  const badge = productCard.querySelector('.product-badge')?.textContent?.trim() || '';
  const priceText = productCard.querySelector('.price')?.textContent?.trim() || '';
  const oldPrice = productCard.querySelector('.price-old')?.textContent?.trim() || '';
  const optionLabel = productCard.dataset.optionLabel || '';
  const optionValues = (productCard.dataset.options || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

  if (productModalImage) {
    productModalImage.src = img ? img.src : '';
    productModalImage.alt = img ? (img.alt || title) : title;
  }
  if (productModalTitle) productModalTitle.textContent = title;
  if (productModalDesc) productModalDesc.textContent = longDesc;

  if (productModalBadge) {
    productModalBadge.textContent = badge;
    productModalBadge.style.display = badge ? 'block' : 'none';
  }

  if (productModalPrice) {
    productModalPrice.innerHTML = oldPrice
      ? '<span class="price-old">' + oldPrice + '</span> <span class="price">' + priceText + '</span>'
      : '<span class="price">' + priceText + '</span>';
  }

  if (productModalOptionWrap && productModalOptionLabel && productModalOption) {
    if (optionLabel && optionValues.length) {
      productModalOptionWrap.style.display = 'flex';
      productModalOptionLabel.textContent = optionLabel;
      productModalOption.innerHTML = optionValues
        .map((v) => '<option value="' + v + '">' + v + '</option>')
        .join('');
    } else {
      productModalOptionWrap.style.display = 'none';
      productModalOption.innerHTML = '';
    }
  }

  productModal.classList.add('open');
  productModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  productModalClose?.focus();
}

function closeProductModal() {
  if (!productModal) return;
  productModal.classList.remove('open');
  productModal.setAttribute('aria-hidden', 'true');
  activeModalProduct = null;
  document.body.style.overflow = '';
  restoreFocus();
}

function autoApplyDiscountPricing() {
  document.querySelectorAll('.product').forEach((productCard) => {
    const badge = productCard.querySelector('.product-badge');
    const priceEl = productCard.querySelector('.price');
    if (!badge || !priceEl) return;

    // Trigger only on badges like "-20%" / "- 20 %"
    const badgeMatch = badge.textContent.match(/(\d+)\s*%/);
    if (!badgeMatch) return;

    const discountPct = Number(badgeMatch[1]);
    if (!discountPct || discountPct <= 0 || discountPct >= 100) return;

    const footer = productCard.querySelector('.product-footer');
    if (!footer || footer.querySelector('.price-wrap')) return;

    const newPriceRaw = (productCard.dataset.price || priceEl.textContent)
      .replace('€', '')
      .replace('EUR', '')
      .replace(',', '.')
      .trim();
    const newPrice = Number(newPriceRaw);
    if (!Number.isFinite(newPrice) || newPrice <= 0) return;

    const oldPrice = newPrice / (1 - discountPct / 100);
    const oldPriceFormatted = oldPrice.toFixed(2).replace('.', ',') + '€';

    const wrap = document.createElement('span');
    wrap.className = 'price-wrap';

    const oldEl = document.createElement('span');
    oldEl.className = 'price-old';
    oldEl.textContent = oldPriceFormatted;

    wrap.appendChild(oldEl);
    wrap.appendChild(priceEl);
    footer.insertBefore(wrap, footer.firstChild);
  });
}

autoApplyDiscountPricing();

function bindProductCards() {
  document.querySelectorAll('.product').forEach((productCard) => {
    const addBtn = productCard.querySelector('.add-cart');
    if (!addBtn || productCard.dataset.productBound === '1') return;

    productCard.dataset.productBound = '1';

    productCard.addEventListener('click', (event) => {
      if (event.target.closest('.add-cart')) return;
      openProductModal(productCard);
    });

    addBtn.addEventListener('click', () => {
      openProductModal(productCard);
    });
  });
}

if (productModalClose) {
  productModalClose.addEventListener('click', closeProductModal);
}

if (productModal) {
  productModal.addEventListener('click', (event) => {
    if (event.target === productModal) closeProductModal();
  });
}

if (productModalAdd) {
  productModalAdd.addEventListener('click', () => {
    if (!activeModalProduct) return;
    const title = activeModalProduct.querySelector('h3')?.textContent?.trim() || 'Produit';
    const optionSuffix = productModalOption && productModalOption.value
      ? ' - ' + productModalOption.value
      : '';
    const optionValue = productModalOption && productModalOption.value ? productModalOption.value : '';
    const optionLabel = activeModalProduct.dataset.optionLabel || 'Option';
    const price = getDisplayedPrice(activeModalProduct);

    addToCart({
      sku: (activeModalProduct.dataset.sku || title) + optionSuffix,
      stripeSku: activeModalProduct.dataset.sku || title,
      baseName: title,
      name: title + optionSuffix,
      optionLabel,
      optionValue,
      price
    });

    closeProductModal();
  });
}

if (cartItemsEl) {
  cartItemsEl.addEventListener('click', (event) => {
    const target = event.target;
    if (!target.dataset.action) return;
    const index = Number(target.dataset.index);
    const item = cart[index];
    if (!item) return;

    if (target.dataset.action === 'plus') item.qty += 1;
    if (target.dataset.action === 'minus') item.qty -= 1;
    if (item.qty <= 0) cart.splice(index, 1);
    renderCart();
  });
}

if (floatingCartBtn) floatingCartBtn.addEventListener('click', openCart);
if (closeCartBtn) closeCartBtn.addEventListener('click', closeCart);

if (clearCartBtn) {
  clearCartBtn.addEventListener('click', () => {
    cart = [];
    renderCart();
  });
}

if (checkoutBtn) {
  checkoutBtn.addEventListener('click', async () => {
    if (cart.length === 0) {
      alert('Ton panier est vide.');
      return;
    }

    try {
      // Correction : remplir la variable globale stripeItems
      stripeItems = cart.map((item) => ({
        sku: item.stripeSku || item.sku,
        qty: item.qty
      }));

      const result = await createStripePaymentIntent({
        items: stripeItems
      });
      if (result.ok) {
        const openResult = await openEmbeddedStripePayment({
          clientSecret: result.clientSecret,
          orderRef: result.orderRef
        });
        if (openResult.ok) return;
        // Si Stripe échoue, afficher une erreur bloquante
        alert('Erreur lors du paiement Stripe. Merci de réessayer plus tard.');
        return;
      }
      // Si Stripe refuse la création de paiement
      alert('Erreur lors de la création du paiement Stripe. Merci de réessayer plus tard.');
    } catch (error) {
      alert('Erreur lors de la communication avec Stripe. Merci de réessayer plus tard.');
    }
  });
}

if (depositBtn) {
  depositBtn.addEventListener('click', async () => {
    const bookingForm = document.querySelector('#page-reservation .booking-form');
    if (!bookingForm) return;

    const showDepositFeedback = (message, type) => {
      if (!depositFeedback) {
        alert(message);
        return;
      }
      depositFeedback.textContent = message;
      depositFeedback.classList.add('show');
      depositFeedback.classList.remove('ok', 'err');
      depositFeedback.classList.add(type === 'ok' ? 'ok' : 'err');
    };

    const prenom = reservationPrenomInput?.value?.trim() || '';
    const nom = reservationNomInput?.value?.trim() || '';
    const telephone = reservationTelephoneInput?.value?.trim() || '';
    const style = reservationStyleInput?.value?.trim() || '';
    const zone = reservationZoneInput?.value?.trim() || '';
    const selectedDate = reservationDayInput?.value?.trim() || '';
    // Récupérer le moment de la journée depuis le champ caché
    const moment = document.getElementById('reservation-moment')?.value?.trim() || '';
    const selectedPeriod = reservationPeriodInput?.value?.trim() || '';
    const periodLabelMap = { 'matin': 'Matin', 'apres-midi': 'Après-midi', 'soiree': 'Soirée' };
    const selectedPeriodLabel = periodLabelMap[selectedPeriod] || '';
    const disponibilites = selectedDate && selectedPeriodLabel
      ? (selectedDate + ' - ' + selectedPeriodLabel)
      : '';
    const description = reservationDescriptionInput?.value?.trim() || '';
    const imageFiles = Array.from(reservationImagesInput?.files || []);
    let images = [];

    // Vérification du moment de la journée obligatoire
    if (!prenom || !nom || !telephone || !description || !selectedDate || !moment) {
      showDepositFeedback('Merci de compléter le formulaire et de choisir un jour et un moment de la journée.', 'err');
      return;
    }

    const minDate = getMinReservationDateKey();
    if (selectedDate < minDate) {
      showDepositFeedback('Le jour choisi doit être au minimum dans 48h.', 'err');
      return;
    }

    if (imageFiles.length > 4) {
      showDepositFeedback('Tu peux joindre jusqu\'a 4 images maximum.', 'err');
      return;
    }

    try {
      for (const file of imageFiles) {
        if (!String(file.type || '').startsWith('image/')) {
          showDepositFeedback('Seuls les fichiers image sont autorisés.', 'err');
          return;
        }
        if (Number(file.size || 0) > 5 * 1024 * 1024) {
          showDepositFeedback('Chaque image doit faire moins de 5 Mo.', 'err');
          return;
        }
        const dataUrl = await readFileAsDataUrl(file);
        images.push({
          name: String(file.name || 'image').slice(0, 120),
          type: String(file.type || 'image/*').slice(0, 80),
          dataUrl
        });
      }
    } catch (error) {
      showDepositFeedback('Impossible de lire une des images sélectionnées.', 'err');
      return;
    }

    if (reservationImagesHint) {
      reservationImagesHint.textContent = imageFiles.length
        ? imageFiles.length + ' image(s) prête(s) à être envoyée(s).'
        : 'Tu peux joindre jusqu\'à 4 images (5 Mo max par image).';
    }

    try {
      // Appel du paiement intégré Stripe (comme la boutique)
      const result = await createStripePaymentIntent({
        items: [{ sku: 'DEPOSIT', qty: 1 }],
        clientName: prenom + ' ' + nom,
        clientFirstName: prenom,
        clientLastName: nom,
        clientPhone: telephone,
        reservationMoment: moment, // Ajout du moment de la journée
        // On peut ajouter d'autres infos si besoin
      });
      if (result.ok) {
        const openResult = await openEmbeddedStripePayment({
          clientSecret: result.clientSecret,
          orderRef: result.orderRef
        });
        if (openResult.ok) return;
        showDepositFeedback('Erreur lors du paiement Stripe. Merci de réessayer plus tard.', 'err');
        return;
      }
      showDepositFeedback('Erreur lors de la création du paiement Stripe. Merci de réessayer plus tard.', 'err');
    } catch (error) {
      showDepositFeedback('Erreur lors de la communication avec Stripe. Merci de réessayer plus tard.', 'err');
    }
  });
}

if (reservationSlotGrid) {
  reservationSlotGrid.addEventListener('click', (event) => {
    const button = event.target instanceof HTMLElement
      ? event.target.closest('[data-slot-date][data-slot-time]')
      : null;
    if (!button || button.hasAttribute('disabled')) return;

    const date = String(button.getAttribute('data-slot-date') || '').trim();
    const time = String(button.getAttribute('data-slot-time') || '').trim();
    if (!date || !time) return;

    reservationDraftSlot = { date, time };
    renderReservationSlotPicker();
  });
}

reservationSlotPrevBtn?.addEventListener('click', () => {
  const start = reservationPickerWeekStart ? new Date(reservationPickerWeekStart) : getMondayFromDate(new Date());
  start.setDate(start.getDate() - 7);
  reservationPickerWeekStart = start;
  renderReservationSlotPicker();
});

reservationSlotNextBtn?.addEventListener('click', () => {
  const start = reservationPickerWeekStart ? new Date(reservationPickerWeekStart) : getMondayFromDate(new Date());
  start.setDate(start.getDate() + 7);
  reservationPickerWeekStart = start;
  renderReservationSlotPicker();
});

reservationOpenSlotPickerBtn?.addEventListener('click', () => {
  openReservationSlotModal().catch(() => {
    if (reservationSlotHint) {
      reservationSlotHint.textContent = 'Impossible de charger le planning pour le moment.';
    }
  });
});

reservationSlotCloseBtn?.addEventListener('click', closeReservationSlotModal);
reservationSlotCancelBtn?.addEventListener('click', closeReservationSlotModal);

reservationSlotConfirmBtn?.addEventListener('click', () => {
  const selection = reservationDraftSlot || reservationSelectedSlot;
  if (!selection) return;

  reservationSelectedSlot = { ...selection };
  if (reservationDisponibilitesInput) {
    reservationDisponibilitesInput.value = `${selection.date} ${selection.time}`;
  }
  closeReservationSlotModal();
});

reservationSlotModal?.addEventListener('click', (event) => {
  if (event.target === reservationSlotModal) {
    closeReservationSlotModal();
  }
});

if (reservationDayInput) {
  reservationDayInput.min = getMinReservationDateKey();
}

function initContactForm() {
  const prenomInput = document.getElementById('contact-prenom');
  const telephoneInput = document.getElementById('contact-telephone');
  const sujetInput = document.getElementById('contact-sujet');
  const messageInput = document.getElementById('contact-message');
  const submitBtn = document.getElementById('contact-submit');
  const feedback = document.getElementById('contact-feedback');

  if (!prenomInput || !telephoneInput || !sujetInput || !messageInput || !submitBtn) {
    return;
  }

  const setFeedback = (message, isError) => {
    if (!feedback) return;
    feedback.textContent = message;
    feedback.style.color = isError ? '#b43030' : 'var(--muted)';
  };

  submitBtn.addEventListener('click', async () => {
    const prenom = String(prenomInput.value || '').trim();
    const telephone = String(telephoneInput.value || '').trim();
    const sujet = String(sujetInput.value || '').trim();
    const message = String(messageInput.value || '').trim();

    if (!prenom || !telephone || !sujet || !message) {
      setFeedback('Merci de compléter tous les champs.', true);
      return;
    }

    if (!telephoneInput.checkValidity()) {
      setFeedback('Numéro invalide. Exemple : 06 12 34 56 78.', true);
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Envoi...';

    try {
      await fetchJson('/api/contact-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prenom, telephone, sujet, message })
      });

      setFeedback('Message envoyé. Merci, on te répond rapidement.', false);
      messageInput.value = '';
    } catch (error) {
      setFeedback('Impossible d\'envoyer le message pour le moment.', true);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Envoyer ->';
    }
  });
}

renderCart();
initDynamicContent().catch(() => {
  loadStateFromLocalStorage();
  applyDefaultOverridesOnPublicPages();
  applyFeaturedRealisationsOnHome();
  renderCustomProducts();
  renderCustomRealisations();
  bindGalleryCells();
  bindProductCards();
  makeCardsKeyboardAccessible();
});
initAdminBackoffice();
loadReservationAvailability();
initContactForm();
