// グローバル変数
let membersData = [];
let projects = [
  {
    id: 1,
    name: "目指せ、最速ロボット！　～自動走行プログラミングにトライ～",
    maxMembers: 8,
  },
  {
    id: 2,
    name: "電気の不思議を探ろう！　～LEDを回路の工夫で光らせよう～",
    maxMembers: 25,
  },
  {
    id: 3,
    name: "ドローンで植物チェック！　～空から見守る緑の元気～",
    maxMembers: 20,
  },
  {
    id: 4,
    name: "“紙”技エンジニアリング！　～長さと強さの最大化に挑戦～",
    maxMembers: 40,
  },
  { id: 5, name: "希望なし", maxMembers: 200 },
];
let currentEditingMember = null;
let currentEditingProject = null;
let selectedSuggestionIndex = -1;

// ページ離脱防止
window.addEventListener("beforeunload", function (e) {
  e.preventDefault();
  e.returnValue = "";
});

// 初期化
document.addEventListener("DOMContentLoaded", function () {
  populateProjectSelects();
  updateProjectList();
  displayInitialProjects();

  // イベントリスナー
  document
    .getElementById("csvFile")
    .addEventListener("change", handleFileSelect);
  document.getElementById("exportCsv").addEventListener("click", exportCsv);
  document
    .getElementById("clearSearchBtn")
    .addEventListener("click", clearSearch);
  document
    .getElementById("searchInput")
    .addEventListener("input", handleSearchInput);
  document
    .getElementById("searchInput")
    .addEventListener("keydown", handleSearchKeydown);
  document.getElementById("searchInput").addEventListener("blur", function () {
    setTimeout(() => {
      document.getElementById("autocompleteSuggestions").style.display = "none";
    }, 200);
  });
  document.getElementById("addMember").addEventListener("click", addNewMember);
  document.getElementById("cancelAdd").addEventListener("click", hideAddForm);
  document
    .getElementById("saveEdit")
    .addEventListener("click", saveProjectEdit);
  document
    .getElementById("cancelEdit")
    .addEventListener("click", closeEditModal);
  document
    .getElementById("saveMaxMembers")
    .addEventListener("click", saveMaxMembers);
  document.querySelector(".close").addEventListener("click", closeEditModal);

  // モーダル外クリックで閉じる
  window.addEventListener("click", function (e) {
    const modal = document.getElementById("editModal");
    const maxModal = document.getElementById("maxMembersModal");
    if (e.target === modal) {
      closeEditModal();
    }
    if (e.target === maxModal) {
      closeMaxMembersModal();
    }
  });
});

// 通知表示
function showNotification(message, type = "success") {
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// ひらがなをカタカナに変換する関数
function hiraganaToKatakana(str) {
  return str.replace(/[\u3041-\u3096]/g, function (match) {
    const chr = match.charCodeAt(0) + 0x60;
    return String.fromCharCode(chr);
  });
}

// リアルタイム検索入力処理
function handleSearchInput(e) {
  let query = e.target.value.trim();

  // ひらがなが含まれている場合はカタカナに変換した検索も行う
  const katakanaQuery = hiraganaToKatakana(query);

  if (query.length === 0) {
    document.getElementById("autocompleteSuggestions").style.display = "none";
    document.getElementById("searchResults").innerHTML = "";
    hideAddForm();
    return;
  }

  // オートコンプリート候補を表示（ひらがな対応）
  showAutocompleteSuggestions(query, katakanaQuery);

  // 検索結果は表示しない（performSearchで処理）
  document.getElementById("searchResults").innerHTML = "";
}

// オートコンプリート候補表示（ひらがな対応版）
function showAutocompleteSuggestions(query, katakanaQuery) {
  const suggestionsDiv = document.getElementById("autocompleteSuggestions");
  const lowerQuery = query.toLowerCase();
  const lowerKatakanaQuery = katakanaQuery.toLowerCase();

  // 重複を避けるためにSetを使用
  const seenMembers = new Set();
  const matches = membersData
    .filter((member) => {
      const isMatch =
        member.kanji.toLowerCase().includes(lowerQuery) ||
        member.katakana.toLowerCase().includes(lowerQuery) ||
        member.katakana.toLowerCase().includes(lowerKatakanaQuery);

      if (isMatch) {
        // 同一人物の重複チェック
        const memberKey = `${member.kanji}-${member.katakana}`;
        if (!seenMembers.has(memberKey)) {
          seenMembers.add(memberKey);
          return true;
        }
      }
      return false;
    })
    .slice(0, 10); // 最大10件まで表示

  if (matches.length === 0) {
    suggestionsDiv.style.display = "none";
    // 候補がない場合は新規追加フォームを表示
    displayNoResults();
    showAddForm();
    return;
  }

  selectedSuggestionIndex = -1;

  const suggestionsHTML = matches
    .map((member, index) => {
      // ひらがなでもハイライトできるように調整
      let kanjiHighlighted = highlightMatch(member.kanji, query);
      let kanaHighlighted = highlightMatch(member.katakana, query);

      // カタカナ変換した検索語でもハイライト
      if (query !== katakanaQuery) {
        kanaHighlighted = highlightMatch(member.katakana, katakanaQuery);
      }

      return `
        <div class="suggestion-item" data-index="${index}" 
             onclick="selectSuggestion('${member.kanji}')">
          <div class="suggestion-name">${kanjiHighlighted} (${kanaHighlighted})</div>
          <div class="suggestion-info">${member.project}</div>
        </div>
      `;
    })
    .join("");

  suggestionsDiv.innerHTML = suggestionsHTML;
  suggestionsDiv.style.display = "block";
}

// 検索キーボード操作
function handleSearchKeydown(e) {
  const suggestionsDiv = document.getElementById("autocompleteSuggestions");
  const suggestions = suggestionsDiv.querySelectorAll(".suggestion-item");

  if (suggestions.length === 0) return;

  switch (e.key) {
    case "ArrowDown":
      e.preventDefault();
      selectedSuggestionIndex = Math.min(
        selectedSuggestionIndex + 1,
        suggestions.length - 1
      );
      updateSelectedSuggestion(suggestions);
      break;
    case "ArrowUp":
      e.preventDefault();
      selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, -1);
      updateSelectedSuggestion(suggestions);
      break;
    case "Enter":
      e.preventDefault();
      if (selectedSuggestionIndex >= 0) {
        const selected = suggestions[selectedSuggestionIndex];
        const name = selected
          .querySelector(".suggestion-name")
          .textContent.split(" (")[0];
        selectSuggestion(name);
      } else if (document.getElementById("searchInput").value) {
        performSearch();
      }
      break;
    case "Escape":
      suggestionsDiv.style.display = "none";
      selectedSuggestionIndex = -1;
      break;
  }
}

// 選択された候補を更新
function updateSelectedSuggestion(suggestions) {
  suggestions.forEach((item, index) => {
    if (index === selectedSuggestionIndex) {
      item.classList.add("selected");
    } else {
      item.classList.remove("selected");
    }
  });
}

// 候補選択
function selectSuggestion(name) {
  document.getElementById("searchInput").value = name;
  document.getElementById("autocompleteSuggestions").style.display = "none";
  performSearch();
}

// マッチ部分をハイライト
function highlightMatch(text, query) {
  const regex = new RegExp(`(${query})`, "gi");
  return text.replace(regex, '<span class="highlight">$1</span>');
}

// 検索クリア
function clearSearch() {
  document.getElementById("searchInput").value = "";
  document.getElementById("searchResults").innerHTML = "";
  document.getElementById("autocompleteSuggestions").style.display = "none";
  hideAddForm();
}

// 検索実行
function performSearch() {
  let query = document.getElementById("searchInput").value.trim().toLowerCase();
  const resultsDiv = document.getElementById("searchResults");

  if (!query) {
    resultsDiv.innerHTML = "";
    hideAddForm();
    return;
  }

  // ひらがなが含まれている場合はカタカナに変換した検索も行う
  const katakanaQuery = hiraganaToKatakana(query).toLowerCase();

  // 重複を避けるためにSetを使用して一意な結果を取得
  const matchedMembers = new Set();
  const matches = membersData.filter((member) => {
    const isMatch =
      member.kanji.toLowerCase().includes(query) ||
      member.katakana.toLowerCase().includes(query) ||
      member.katakana.toLowerCase().includes(katakanaQuery);

    if (isMatch) {
      // 同一人物の重複チェック（漢字名＋カタカナ名の組み合わせで判定）
      const memberKey = `${member.kanji}-${member.katakana}`;
      if (!matchedMembers.has(memberKey)) {
        matchedMembers.add(memberKey);
        return true;
      }
    }
    return false;
  });

  if (matches.length > 0) {
    displaySearchResults(matches);
    hideAddForm();
  } else {
    displayNoResults();
    showAddForm();
  }
}

// 初期プロジェクト表示（空の状態）
function displayInitialProjects() {
  const projectListDiv = document.getElementById("projectList");

  const projectCards = projects
    .map(
      (project) => `
          <div class="project-card" data-project-id="${project.id}">
              <div class="full-badge">満員</div>
              <div class="project-header">
                  <div class="project-number">${project.id}</div>
                  <button class="project-edit-btn" onclick="openMaxMembersModal(${project.id})" title="最大人数を編集">⚙️</button>
              </div>
              <div class="project-title">${project.name}</div>
              <div class="project-stats">
                  <div class="stat-item">
                      <div class="stat-number">0/${project.maxMembers}</div>
                      <div class="stat-label">出席者/最大人数</div>
                  </div>
                  <div class="stat-item">
                      <div class="stat-number">0</div>
                      <div class="stat-label">事前登録者</div>
                  </div>
                  <div class="stat-item">
                      <div class="stat-number">0</div>
                      <div class="stat-label">当日登録者</div>
                  </div>
              </div>
              <div class="member-list">
                  <div class="member-item">参加者なし</div>
              </div>
          </div>
      `
    )
    .join("");

  projectListDiv.innerHTML = projectCards;
}

// ファイル読み込み処理
function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  const fileName = file.name.toLowerCase();
  const isExcel = fileName.endsWith(".xlsx") || fileName.endsWith(".xls");

  if (isExcel) {
    handleExcelFile(file);
  } else {
    handleCSVFile(file);
  }
}

// Excelファイル処理
function handleExcelFile(file) {
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      parseExcelData(e.target.result);
    } catch (error) {
      showNotification(
        "Excelファイルの読み込みに失敗しました: " + error.message,
        "error"
      );
    }
  };
  reader.readAsArrayBuffer(file);
}

// Excel データ解析
function parseExcelData(data) {
  const workbook = XLSX.read(data, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  if (jsonData.length < 2) {
    showNotification("Excelファイルが正しくありません", "error");
    return;
  }

  const headers = jsonData[0];
  membersData = [];

  // 新しいフォーマットに対応したカラムマッピング
  let seiIndex = -1,
    meiIndex = -1,
    seiKanaIndex = -1,
    meiKanaIndex = -1,
    cs1Index = -1,
    cs2Index = -1,
    cs3Index = -1,
    attendanceIndex = -1;

  headers.forEach((header, index) => {
    const h = header.toString().trim();
    if (h === "姓") {
      seiIndex = index;
    } else if (h === "名") {
      meiIndex = index;
    } else if (h === "セイ") {
      seiKanaIndex = index;
    } else if (h === "メイ") {
      meiKanaIndex = index;
    } else if (h === "CS第一希望") {
      cs1Index = index;
    } else if (h === "CS第二希望") {
      cs2Index = index;
    } else if (h === "CS第三希望") {
      cs3Index = index;
    } else if (h.includes("出席") || h.includes("参加")) {
      attendanceIndex = index;
    }
  });

  if (
    seiIndex === -1 ||
    meiIndex === -1 ||
    seiKanaIndex === -1 ||
    meiKanaIndex === -1 ||
    cs1Index === -1
  ) {
    showNotification(
      "必要な列（姓、名、セイ、メイ、CS第一希望）が見つかりません",
      "error"
    );
    return;
  }

  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i];
    if (
      row[seiIndex] &&
      row[meiIndex] &&
      row[seiKanaIndex] &&
      row[meiKanaIndex]
    ) {
      const kanji = `${row[seiIndex]}${row[meiIndex]}`.trim();
      const katakana = `${row[seiKanaIndex]}${row[meiKanaIndex]}`.trim();
      const cs1 = row[cs1Index] ? row[cs1Index].toString().trim() : "";
      const cs2 = row[cs2Index] ? row[cs2Index].toString().trim() : "";
      const cs3 = row[cs3Index] ? row[cs3Index].toString().trim() : "";

      // CS第一希望に基づいてプロジェクトを割り当て
      let assignedProject = "希望なし";
      if (cs1) {
        assignedProject = cs1;
      }

      membersData.push({
        kanji: kanji,
        katakana: katakana,
        project: assignedProject,
        cs1: cs1,
        cs2: cs2,
        cs3: cs3,
        registrationType: "事前登録", // Excel/CSVから読み込まれたデータは事前登録
        attendance:
          attendanceIndex !== -1 && row[attendanceIndex]
            ? row[attendanceIndex].toString().trim()
            : "pending",
      });
    }
  }

  updateProjectList();
  showNotification(
    `${membersData.length}件のデータを読み込みました`,
    "success"
  );
}

// CSVファイル処理
function handleCSVFile(file) {
  const reader = new FileReader();
  reader.onload = function (e) {
    const csv = e.target.result;
    parseCSV(csv);
  };
  reader.readAsText(file, "UTF-8");
}

// CSV解析
function parseCSV(csv) {
  const lines = csv.split("\n").filter((line) => line.trim());
  if (lines.length < 2) {
    showNotification("CSVファイルが正しくありません", "error");
    return;
  }

  const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
  membersData = [];

  // 新しいフォーマットまたは旧フォーマットに対応
  let seiIndex = -1,
    meiIndex = -1,
    seiKanaIndex = -1,
    meiKanaIndex = -1,
    cs1Index = -1,
    cs2Index = -1,
    cs3Index = -1,
    attendanceIndex = -1;

  // 旧フォーマット用
  let kanjiIndex = -1,
    kanaIndex = -1,
    projectIndex = -1;

  headers.forEach((header, index) => {
    const h = header.trim();
    // 新フォーマット
    if (h === "姓") {
      seiIndex = index;
    } else if (h === "名") {
      meiIndex = index;
    } else if (h === "セイ") {
      seiKanaIndex = index;
    } else if (h === "メイ") {
      meiKanaIndex = index;
    } else if (h === "CS第一希望") {
      cs1Index = index;
    } else if (h === "CS第二希望") {
      cs2Index = index;
    } else if (h === "CS第三希望") {
      cs3Index = index;
    }
    // 旧フォーマット
    else if (h.includes("漢字") || h === "名前（漢字）") {
      kanjiIndex = index;
    } else if (
      h.includes("カナ") ||
      h.includes("カタカナ") ||
      h === "名前（カナ）"
    ) {
      kanaIndex = index;
    } else if (
      h.includes("プロジェクト") ||
      h.includes("プログラム") ||
      h === "現在のプログラム"
    ) {
      projectIndex = index;
    } else if (h.includes("出席") || h.includes("参加")) {
      attendanceIndex = index;
    }
  });

  // 新フォーマットかどうかを判定
  const isNewFormat =
    seiIndex !== -1 &&
    meiIndex !== -1 &&
    seiKanaIndex !== -1 &&
    meiKanaIndex !== -1 &&
    cs1Index !== -1;

  if (
    !isNewFormat &&
    (kanjiIndex === -1 || kanaIndex === -1 || projectIndex === -1)
  ) {
    showNotification(
      "必要な列が見つかりません。新フォーマット（姓、名、セイ、メイ、CS第一希望）または旧フォーマット（名前（漢字）、名前（カナ）、プログラム）が必要です。",
      "error"
    );
    return;
  }

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim().replace(/"/g, ""));

    if (isNewFormat) {
      // 新フォーマットの処理
      if (
        values[seiIndex] &&
        values[meiIndex] &&
        values[seiKanaIndex] &&
        values[meiKanaIndex]
      ) {
        const kanji = `${values[seiIndex]}${values[meiIndex]}`.trim();
        const katakana =
          `${values[seiKanaIndex]}${values[meiKanaIndex]}`.trim();
        const cs1 = values[cs1Index] ? values[cs1Index].toString().trim() : "";
        const cs2 = values[cs2Index] ? values[cs2Index].toString().trim() : "";
        const cs3 = values[cs3Index] ? values[cs3Index].toString().trim() : "";

        // CS第一希望に基づいてプロジェクトを割り当て
        let assignedProject = "希望なし";
        if (cs1) {
          assignedProject = cs1;
        }

        membersData.push({
          kanji: kanji,
          katakana: katakana,
          project: assignedProject,
          cs1: cs1,
          cs2: cs2,
          cs3: cs3,
          registrationType: "事前登録", // Excel/CSVから読み込まれたデータは事前登録
          attendance:
            attendanceIndex !== -1 && values[attendanceIndex]
              ? values[attendanceIndex]
              : "pending",
        });
      }
    } else {
      // 旧フォーマットの処理
      if (values[kanjiIndex] && values[kanaIndex] && values[projectIndex]) {
        membersData.push({
          kanji: values[kanjiIndex],
          katakana: values[kanaIndex],
          project: values[projectIndex],
          cs1: values[projectIndex], // 旧データの場合は現在のプロジェクトを第一希望とする
          cs2: "",
          cs3: "",
          registrationType: "事前登録", // Excel/CSVから読み込まれたデータは事前登録
          attendance:
            attendanceIndex !== -1 && values[attendanceIndex]
              ? values[attendanceIndex]
              : "pending",
        });
      }
    }
  }

  updateProjectList();
  showNotification(
    `${membersData.length}件のデータを読み込みました`,
    "success"
  );
}

// プロジェクトセレクト更新
function populateProjectSelects() {
  const selects = ["projectSelect", "editProjectSelect"];
  selects.forEach((selectId) => {
    const select = document.getElementById(selectId);
    select.innerHTML = '<option value="">プログラムを選択</option>';
    projects.forEach((project) => {
      const projectPresentMembers = membersData.filter(
        (m) => m.project === project.name && m.attendance === "present"
      );
      const projectAllMembers = membersData.filter(
        (m) => m.project === project.name
      );
      const isFull = projectPresentMembers.length >= project.maxMembers;

      const option = document.createElement("option");
      option.value = project.name;
      option.textContent = `${project.id}. ${project.name} (${projectPresentMembers.length}/${project.maxMembers}人出席, 全${projectAllMembers.length}人)`;

      if (isFull && selectId === "projectSelect") {
        option.disabled = true;
        option.textContent += " - 満員";
      }

      select.appendChild(option);
    });
  });
}

// 検索結果表示
function displaySearchResults(matches) {
  const resultsDiv = document.getElementById("searchResults");
  resultsDiv.innerHTML = matches
    .map((member) => {
      // 表示名を決定（両方ある場合は両方表示、片方の場合はその片方のみ）
      let nameDisplay = "";
      if (member.kanji && member.katakana) {
        nameDisplay = `${member.kanji} (${member.katakana})`;
      } else if (member.kanji) {
        nameDisplay = member.kanji;
      } else if (member.katakana) {
        nameDisplay = member.katakana;
      }

      // CS希望情報を表示用に整形
      const csPreferences = [];
      if (member.cs1) csPreferences.push(`第一希望: ${member.cs1}`);
      if (member.cs2) csPreferences.push(`第二希望: ${member.cs2}`);
      if (member.cs3) csPreferences.push(`第三希望: ${member.cs3}`);
      const csPreferencesDisplay =
        csPreferences.length > 0 ? csPreferences.join("<br>") : "希望情報なし";

      return `
          <div class="result-card">
              <div class="result-info">
                  <div class="info-item">
                      <div class="info-label">名前</div>
                      <div class="info-value">${nameDisplay}</div>
                  </div>
                  <div class="info-item">
                      <div class="info-label">現在の割り当て</div>
                      <div class="info-value">${member.project}</div>
                  </div>
                  <div class="info-item">
                      <div class="info-label">CS希望</div>
                      <div class="info-value" style="font-size: 14px; line-height: 1.4;">${csPreferencesDisplay}</div>
                  </div>
                  <div class="info-item">
                      <div class="info-label">出席状況</div>
                      <div class="info-value">
                          <span class="attendance-status status-${
                            member.attendance
                          }">
                              ${getAttendanceText(member.attendance)}
                          </span>
                      </div>
                  </div>
              </div>
              <div class="result-actions">
                  <button class="btn btn-warning" onclick="editProject('${
                    member.kanji || member.katakana
                  }')">プログラム変更</button>
                  <button class="btn btn-success" onclick="markAttendance('${
                    member.kanji || member.katakana
                  }', 'present')">出席</button>
                  <button class="btn btn-danger" onclick="markAttendance('${
                    member.kanji || member.katakana
                  }', 'absent')">欠席</button>
              </div>
          </div>
        `;
    })
    .join("");
}

// 検索結果なしの表示
function displayNoResults() {
  const resultsDiv = document.getElementById("searchResults");
  resultsDiv.innerHTML = `
          <div class="result-card">
              <p style="margin-bottom: 15px;">該当する参加者が見つかりませんでした。</p>
              <p>新しい参加者を追加しますか？</p>
          </div>
      `;
}

// 追加フォーム表示
function showAddForm() {
  document.getElementById("addForm").style.display = "block";
  const searchValue = document.getElementById("searchInput").value;

  // 検索値が漢字かカタカナかひらがなかを判定
  if (/[ァ-ヶー]+/.test(searchValue)) {
    // カタカナの場合
    document.getElementById("katakanaName").value = searchValue;
    document.getElementById("kanjiName").value = "";
  } else if (/[ぁ-ん]+/.test(searchValue)) {
    // ひらがなの場合はカタカナに変換
    document.getElementById("katakanaName").value =
      hiraganaToKatakana(searchValue);
    document.getElementById("kanjiName").value = "";
  } else {
    // それ以外（漢字など）
    document.getElementById("kanjiName").value = searchValue;
    document.getElementById("katakanaName").value = "";
  }

  populateProjectSelects(); // セレクトボックスを更新
}

// 追加フォーム非表示
function hideAddForm() {
  document.getElementById("addForm").style.display = "none";
  document.getElementById("kanjiName").value = "";
  document.getElementById("katakanaName").value = "";
  document.getElementById("projectSelect").value = "";
}

// 新規メンバー追加
function addNewMember() {
  const kanji = document.getElementById("kanjiName").value.trim();
  const katakana = document.getElementById("katakanaName").value.trim();
  const projectName = document.getElementById("projectSelect").value;

  // 漢字かカタカナのどちらか一方は必須
  if ((!kanji && !katakana) || !projectName) {
    showNotification(
      "名前（漢字またはカタカナ）とプログラムを入力してください",
      "warning"
    );
    return;
  }

  // プロジェクトの人数制限チェック（出席者数ベース）
  const project = projects.find((p) => p.name === projectName);
  const projectPresentMembers = membersData.filter(
    (m) => m.project === projectName && m.attendance === "present"
  );

  if (projectPresentMembers.length >= project.maxMembers) {
    showNotification(
      `${projectName}は満員です。他のプログラムを選択してください。`,
      "error"
    );
    return;
  }

  // 名前の表示用（漢字優先、なければカタカナ）
  const displayName = kanji || katakana;

  membersData.push({
    kanji: kanji || "", // 空でも可
    katakana: katakana || "", // 空でも可
    project: projectName,
    cs1: projectName, // 追加時のプロジェクトを第一希望として設定
    cs2: "", // 新規追加の場合は空
    cs3: "", // 新規追加の場合は空
    registrationType: "当日登録", // 手動で追加された人は当日登録
    attendance: "present", // 出席状態で登録
  });

  hideAddForm();
  updateProjectList();
  clearSearch();
  showNotification(
    `${displayName}さんを${projectName}に追加し、出席登録しました`,
    "success"
  );
}

// プロジェクト編集
function editProject(identifier) {
  const member = membersData.find(
    (m) => m.kanji === identifier || m.katakana === identifier
  );
  if (!member) return;

  currentEditingMember = member;
  document.getElementById("editProjectSelect").value = member.project;
  populateProjectSelects(); // セレクトボックスを更新
  document.getElementById("editModal").style.display = "block";
}

// プロジェクト編集保存
function saveProjectEdit() {
  const newProject = document.getElementById("editProjectSelect").value;
  if (!newProject) {
    showNotification("プログラムを選択してください", "warning");
    return;
  }

  // 新しいプロジェクトの人数制限チェック（出席者数ベース）
  const project = projects.find((p) => p.name === newProject);
  const projectPresentMembers = membersData.filter(
    (m) =>
      m.project === newProject &&
      m.attendance === "present" &&
      m !== currentEditingMember
  );

  // 編集対象メンバーが出席の場合はカウントに含める
  const wouldBePresentCount =
    currentEditingMember.attendance === "present"
      ? projectPresentMembers.length + 1
      : projectPresentMembers.length;

  if (wouldBePresentCount > project.maxMembers) {
    showNotification(
      `${newProject}は満員です。他のプログラムを選択してください。`,
      "error"
    );
    return;
  }

  const oldProject = currentEditingMember.project;
  const displayName =
    currentEditingMember.kanji || currentEditingMember.katakana;
  currentEditingMember.project = newProject;
  closeEditModal();
  updateProjectList();
  performSearch();
  showNotification(
    `${displayName}さんのプログラムを${oldProject}から${newProject}に変更しました`,
    "success"
  );
}

// モーダルを閉じる
function closeEditModal() {
  document.getElementById("editModal").style.display = "none";
  currentEditingMember = null;
}

// 最大人数編集モーダルを開く
function openMaxMembersModal(projectId) {
  const project = projects.find((p) => p.id === projectId);
  if (!project) return;

  currentEditingProject = project;
  document.getElementById("editProjectName").value = project.name;
  document.getElementById("editMaxMembers").value = project.maxMembers;
  document.getElementById("maxMembersModal").style.display = "block";
}

// 最大人数編集モーダルを閉じる
function closeMaxMembersModal() {
  document.getElementById("maxMembersModal").style.display = "none";
  currentEditingProject = null;
}

// 最大人数を保存
function saveMaxMembers() {
  const newMaxMembers = parseInt(
    document.getElementById("editMaxMembers").value
  );

  if (!newMaxMembers || newMaxMembers < 1) {
    showNotification("最大人数は1以上の数値を入力してください", "warning");
    return;
  }

  const projectPresentMembers = membersData.filter(
    (m) =>
      m.project === currentEditingProject.name && m.attendance === "present"
  );

  if (newMaxMembers < projectPresentMembers.length) {
    showNotification(
      `現在の出席者数（${projectPresentMembers.length}人）より少ない値は設定できません`,
      "error"
    );
    return;
  }

  currentEditingProject.maxMembers = newMaxMembers;
  closeMaxMembersModal();
  updateProjectList();
  populateProjectSelects();
  showNotification(
    `${currentEditingProject.name}の最大人数を${newMaxMembers}人に変更しました`,
    "success"
  );
}

// 出席記録
function markAttendance(identifier, status) {
  const member = membersData.find(
    (m) => m.kanji === identifier || m.katakana === identifier
  );
  if (member) {
    const displayName = member.kanji || member.katakana;
    member.attendance = status;
    updateProjectList();
    performSearch();
    showNotification(
      `${displayName}さんを${getAttendanceText(status)}に設定しました`,
      status === "present" ? "success" : "warning"
    );
  }
}

// 出席状況テキスト取得
function getAttendanceText(status) {
  switch (status) {
    case "present":
      return "出席";
    case "absent":
      return "欠席";
    default:
      return "未確認";
  }
}

// プロジェクト一覧更新
function updateProjectList() {
  const projectListDiv = document.getElementById("projectList");
  const absentListDiv = document.getElementById("absentList");
  const absentMembersDiv = document.getElementById("absentMembers");

  let absentMembers = [];

  const projectCards = projects
    .map((project) => {
      const projectMembers = membersData.filter(
        (m) => m.project === project.name
      );
      const presentMembers = projectMembers.filter(
        (m) => m.attendance === "present"
      );
      const preRegisteredMembers = projectMembers.filter(
        (m) => m.registrationType === "事前登録"
      );
      const preRegisteredPresentMembers = preRegisteredMembers.filter(
        (m) => m.attendance === "present"
      );
      const dayRegisteredMembers = projectMembers.filter(
        (m) => m.registrationType === "当日登録"
      );
      const projectAbsent = projectMembers.filter(
        (m) => m.attendance === "absent"
      );

      absentMembers = absentMembers.concat(projectAbsent);

      const isFull = presentMembers.length >= project.maxMembers;

      // 色分けロジック
      let cardColorClass = "";
      if (
        preRegisteredMembers.length > project.maxMembers ||
        presentMembers.length > project.maxMembers
      ) {
        // 事前登録者数または出席者数が許容人数を超えている場合は赤色
        cardColorClass = "over-capacity-red";
      } else if (projectMembers.length >= project.maxMembers) {
        // 事前登録者＋当日参加者が許容人数を超えている場合は黄色
        cardColorClass = "over-capacity-yellow";
      }

      const membersList =
        projectMembers.length > 0
          ? projectMembers
              .map((member) => {
                // 表示名を決定
                let nameDisplay = "";
                if (member.kanji && member.katakana) {
                  nameDisplay = `${member.kanji} (${member.katakana})`;
                } else if (member.kanji) {
                  nameDisplay = member.kanji;
                } else if (member.katakana) {
                  nameDisplay = member.katakana;
                }

                // 識別子（漢字優先、なければカタカナ）
                const identifier = member.kanji || member.katakana;

                return `
                  <div class="member-item">
                      <span class="member-name" onclick="showMemberDetails('${identifier}')" style="cursor: pointer; color: #0f8c52; text-decoration: underline;">
                          ${nameDisplay}
                      </span>
                      <span class="attendance-status status-${
                        member.attendance
                      }">
                          ${getAttendanceText(member.attendance)}
                      </span>
                  </div>
                `;
              })
              .join("")
          : '<div class="member-item">参加者なし</div>';

      return `
              <div class="project-card ${
                isFull ? "full" : ""
              } ${cardColorClass}" data-project-id="${project.id}">
                  <div class="full-badge">満員</div>
                  <div class="project-header">
                      <div class="project-number">${project.id}</div>
                      <button class="project-edit-btn" onclick="openMaxMembersModal(${
                        project.id
                      })" title="最大人数を編集">⚙️</button>
                  </div>
                  <div class="project-title">${project.name}</div>
                  <div class="project-stats">
                      <div class="stat-item">
                          <div class="stat-number">${presentMembers.length}/${
        project.maxMembers
      }</div>
                          <div class="stat-label">出席者/最大人数</div>
                      </div>
                      <div class="stat-item">
                          <div class="stat-number">${
                            preRegisteredPresentMembers.length
                          }/${preRegisteredMembers.length}</div>
                          <div class="stat-label">事前登録者</div>
                      </div>
                      <div class="stat-item">
                          <div class="stat-number">${
                            dayRegisteredMembers.length
                          }</div>
                          <div class="stat-label">当日登録者</div>
                      </div>
                  </div>
                  <div class="member-list">
                      ${membersList}
                  </div>
              </div>
          `;
    })
    .join("");

  projectListDiv.innerHTML = projectCards;

  // 欠席者リスト更新
  if (absentMembers.length > 0) {
    absentMembersDiv.innerHTML = absentMembers
      .map((member) => {
        // 表示名を決定
        let nameDisplay = "";
        if (member.kanji && member.katakana) {
          nameDisplay = `${member.kanji} (${member.katakana})`;
        } else if (member.kanji) {
          nameDisplay = member.kanji;
        } else if (member.katakana) {
          nameDisplay = member.katakana;
        }

        // 識別子（漢字優先、なければカタカナ）
        const identifier = member.kanji || member.katakana;

        return `
              <div class="absent-member">
                  <span class="member-name" onclick="showMemberDetails('${identifier}')" style="cursor: pointer; color: #721c24; text-decoration: underline;">
                      ${nameDisplay}
                  </span><br>
                  <small>${member.project}</small>
              </div>
          `;
      })
      .join("");
    absentListDiv.style.display = "block";
  } else {
    absentListDiv.style.display = "none";
  }
}

// 参加者詳細表示
function showMemberDetails(identifier) {
  // 該当する参加者を検索
  const member = membersData.find(
    (m) => m.kanji === identifier || m.katakana === identifier
  );

  if (!member) {
    showNotification("参加者が見つかりませんでした", "error");
    return;
  }

  // 検索結果と同じ形式で表示
  displaySearchResults([member]);

  // 検索ボックスに名前を設定
  document.getElementById("searchInput").value = identifier;

  // 検索結果エリアまでスクロール
  document.getElementById("searchResults").scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

// ファイル書き出し
function exportCsv() {
  if (membersData.length === 0) {
    showNotification("出力するデータがありません", "warning");
    return;
  }

  const format = confirm(
    "Excelファイルで出力しますか？\n「OK」: Excel形式\n「キャンセル」: CSV形式"
  );

  if (format) {
    exportExcel();
  } else {
    exportCSV();
  }
}

// Excel出力
function exportExcel() {
  const headers = [
    "名前（漢字）",
    "名前（カナ）",
    "現在のプログラム",
    "CS第一希望",
    "CS第二希望",
    "CS第三希望",
    "出席状況",
  ];
  const data = [headers];

  membersData.forEach((member) => {
    data.push([
      member.kanji,
      member.katakana,
      member.project,
      member.cs1 || "",
      member.cs2 || "",
      member.cs3 || "",
      getAttendanceText(member.attendance),
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "参加者一覧");

  const today = new Date();
  const dateStr =
    today.getFullYear() +
    String(today.getMonth() + 1).padStart(2, "0") +
    String(today.getDate()).padStart(2, "0");

  XLSX.writeFile(wb, `オープンキャンパス受付_${dateStr}.xlsx`);
  showNotification("Excelファイルをダウンロードしました", "success");
}

// CSV出力
function exportCSV() {
  const headers = [
    "名前（漢字）",
    "名前（カナ）",
    "現在のプログラム",
    "CS第一希望",
    "CS第二希望",
    "CS第三希望",
    "出席状況",
  ];
  const csvContent = [headers.join(",")];

  membersData.forEach((member) => {
    const row = [
      `"${member.kanji}"`,
      `"${member.katakana}"`,
      `"${member.project}"`,
      `"${member.cs1 || ""}"`,
      `"${member.cs2 || ""}"`,
      `"${member.cs3 || ""}"`,
      `"${getAttendanceText(member.attendance)}"`,
    ];
    csvContent.push(row.join(","));
  });

  const csv = csvContent.join("\n");
  const bom = "\uFEFF";
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");

  if (link.download !== undefined) {
    const today = new Date();
    const dateStr =
      today.getFullYear() +
      String(today.getMonth() + 1).padStart(2, "0") +
      String(today.getDate()).padStart(2, "0");

    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `オープンキャンパス受付_${dateStr}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification("CSVファイルをダウンロードしました", "success");
  }
}
