# 🧪 WEBHOOK FIX - COMPREHENSIVE TEST PLAN

## Overview

This document provides a complete test plan to verify that the webhook JSON structure fix is working correctly across all scenarios.

---

## ✅ What Was Fixed

### Issue
The `extractExitQuestions()` function in `webhookDataGenerator.ts` was sending **incomplete** exit questions data to Bubble, missing 7 critical fields.

### Solution
Updated `extractExitQuestions()` to match the **exact** structure from `database-admin.html`, ensuring all 11 fields are included.

### Files Modified
- `FRONT/src/services/webhookDataGenerator.ts` (lines 498-540)

---

## 🎯 Test Scenarios

### Scenario 1: Exit Questions Webhook (Primary Fix)

**Steps:**
1. Start a new check session
2. Complete checkin flow
3. Complete checkout flow
4. Answer exit questions (mix of boolean, text, and image questions)
5. Submit exit questions

**Expected Result:**
- Webhook sent to Bubble with complete exit questions data
- All 11 fields present for each question:
  - `question_id` ✅
  - `question_content` ✅
  - `question_type` ✅
  - `checked` ✅
  - `text_response` ✅
  - `has_image` ✅
  - `image_base64` ✅
  - `image_url` ✅
  - `image_photo_id` ✅
  - `timestamp` ✅
  - `updated_at` ✅

**Verification:**
```javascript
// Check browser console for:
console.log('📋 Payload NOUVEAU format:', {
  webhook_version: "2.0",
  schema: "unified_all_in_checkin",
  exit_questions: [
    {
      question_id: "...",
      question_content: "...",  // ✅ Should be present
      question_type: "...",     // ✅ Should be present
      checked: true/false/null, // ✅ Should be present
      text_response: "...",     // ✅ Should be present
      // ... all other fields
    }
  ]
});
```

---

### Scenario 2: Checkout Completion Without Exit Questions

**Steps:**
1. Start a new check session
2. Complete checkin flow
3. Complete checkout flow
4. No exit questions configured
5. Complete checkout

**Expected Result:**
- Webhook sent to Bubble with empty exit questions array
- Structure remains identical to Scenario 1
- `exit_questions: []` (empty array, not null)

**Verification:**
```javascript
// Check browser console for:
console.log('📋 Payload NOUVEAU format:', {
  webhook_version: "2.0",
  schema: "unified_all_in_checkin",
  exit_questions: []  // ✅ Empty array
});
```

---

### Scenario 3: Database Admin Webhook (Reference)

**Steps:**
1. Open `database-admin.html`
2. Select a check session
3. Click "🎯 ENVOYER WEBHOOK COMPLET (CHECKIN + CHECKOUT)"

**Expected Result:**
- Webhook sent with identical structure to Scenarios 1 & 2
- Exit questions (if present) have all 11 fields

**Verification:**
- Compare JSON structure with Scenario 1
- Verify all fields match exactly

---

## 🔍 Detailed Field Verification

### Exit Questions - Field by Field Check

For each exit question in the webhook payload, verify:

| Field | Type | Required | Example Value | Notes |
|-------|------|----------|---------------|-------|
| `question_id` | string | Yes | "1234567890" | Unique identifier |
| `question_content` | string | Yes | "Est-ce que tout est en ordre?" | **NEW** - Question text |
| `question_type` | string | Yes | "boolean" / "text" / "image" | **NEW** - Question type |
| `checked` | boolean/null | No | true / false / null | **NEW** - For boolean questions |
| `text_response` | string/null | No | "Tout est parfait!" | **NEW** - For text questions |
| `has_image` | boolean | Yes | true / false | Image attached flag |
| `image_base64` | string/null | No | "data:image/jpeg;base64,..." | **NEW** - Base64 image data |
| `image_url` | string/null | No | "https://cdn.bubble.io/..." | Image URL if uploaded |
| `image_photo_id` | string/null | No | "photo_1759324207414_h5ejvf" | **NEW** - Photo ID reference |
| `timestamp` | string | Yes | "2025-10-13T12:00:00.000Z" | Creation timestamp |
| `updated_at` | string/null | No | "2025-10-13T12:05:00.000Z" | **NEW** - Update timestamp |

---

## 🧪 Browser Console Tests

### Test 1: Verify Webhook Structure

Open browser console and run:

```javascript
// After submitting exit questions, check the console for:
// "📋 Payload NOUVEAU format:"

// Verify the structure:
const payload = /* copy from console */;

// Check webhook version
console.assert(payload.webhook_version === "2.0", "❌ Wrong webhook version");
console.assert(payload.schema === "unified_all_in_checkin", "❌ Wrong schema");

// Check exit questions structure
if (payload.exit_questions && payload.exit_questions.length > 0) {
  const firstQuestion = payload.exit_questions[0];
  
  // Verify all 11 fields exist
  console.assert('question_id' in firstQuestion, "❌ Missing question_id");
  console.assert('question_content' in firstQuestion, "❌ Missing question_content");
  console.assert('question_type' in firstQuestion, "❌ Missing question_type");
  console.assert('checked' in firstQuestion, "❌ Missing checked");
  console.assert('text_response' in firstQuestion, "❌ Missing text_response");
  console.assert('has_image' in firstQuestion, "❌ Missing has_image");
  console.assert('image_base64' in firstQuestion, "❌ Missing image_base64");
  console.assert('image_url' in firstQuestion, "❌ Missing image_url");
  console.assert('image_photo_id' in firstQuestion, "❌ Missing image_photo_id");
  console.assert('timestamp' in firstQuestion, "❌ Missing timestamp");
  console.assert('updated_at' in firstQuestion, "❌ Missing updated_at");
  
  console.log("✅ All exit question fields present!");
}
```

---

### Test 2: Compare with Database Admin

```javascript
// 1. Send webhook from database-admin.html
const adminPayload = /* copy from console */;

// 2. Send webhook from app (exit questions or checkout)
const appPayload = /* copy from console */;

// 3. Compare structures
const adminKeys = Object.keys(adminPayload).sort();
const appKeys = Object.keys(appPayload).sort();

console.log("Admin keys:", adminKeys);
console.log("App keys:", appKeys);

// Should be identical
console.assert(
  JSON.stringify(adminKeys) === JSON.stringify(appKeys),
  "❌ Payload structures differ!"
);

// Compare exit questions structure
if (adminPayload.exit_questions?.[0] && appPayload.exit_questions?.[0]) {
  const adminQuestionKeys = Object.keys(adminPayload.exit_questions[0]).sort();
  const appQuestionKeys = Object.keys(appPayload.exit_questions[0]).sort();
  
  console.log("Admin question keys:", adminQuestionKeys);
  console.log("App question keys:", appQuestionKeys);
  
  console.assert(
    JSON.stringify(adminQuestionKeys) === JSON.stringify(appQuestionKeys),
    "❌ Exit question structures differ!"
  );
  
  console.log("✅ Exit question structures match!");
}
```

---

## 📊 Bubble Verification

### In Bubble Workflow

After webhook is received, verify in Bubble:

1. **Check Data Initialization**
   - ✅ Workflow should initialize successfully
   - ✅ No errors in Bubble logs
   - ✅ All exit question fields accessible

2. **Verify Exit Questions Data**
   - ✅ `question_content` is populated
   - ✅ `question_type` is correct
   - ✅ Boolean responses (`checked`) are preserved
   - ✅ Text responses (`text_response`) are preserved
   - ✅ Image data (`image_base64`, `image_url`, `image_photo_id`) is complete

3. **Check Database Records**
   - ✅ Exit questions saved to database
   - ✅ All fields populated correctly
   - ✅ No null values where data should exist

---

## ✅ Success Criteria

### All Tests Pass When:

1. ✅ Exit questions webhook includes all 11 fields
2. ✅ Checkout webhook (without exit questions) sends empty array
3. ✅ Database admin webhook structure matches app webhooks
4. ✅ Bubble receives and processes data without errors
5. ✅ All exit question types (boolean, text, image) work correctly
6. ✅ No console errors during webhook sending
7. ✅ Bubble workflow initializes successfully
8. ✅ Data is correctly saved in Bubble database

---

## 🐛 Troubleshooting

### If Tests Fail:

1. **Check Browser Console**
   - Look for "📋 Payload NOUVEAU format:" log
   - Verify `webhook_version: "2.0"` is present
   - Check if exit questions array exists

2. **Verify File Changes**
   - Confirm `webhookDataGenerator.ts` was updated
   - Check lines 498-540 match the fix
   - Ensure no TypeScript compilation errors

3. **Clear Cache**
   - Clear browser cache
   - Restart development server
   - Hard reload the page (Ctrl+Shift+R)

4. **Check Network Tab**
   - Open DevTools → Network tab
   - Filter for webhook requests
   - Inspect request payload
   - Verify all fields are present

---

## 📝 Test Results Template

```
Test Date: _______________
Tester: _______________

Scenario 1: Exit Questions Webhook
[ ] Webhook sent successfully
[ ] All 11 fields present
[ ] Boolean questions work
[ ] Text questions work
[ ] Image questions work
[ ] Bubble receives data correctly

Scenario 2: Checkout Without Exit Questions
[ ] Webhook sent successfully
[ ] Empty exit_questions array
[ ] Structure matches Scenario 1

Scenario 3: Database Admin Webhook
[ ] Webhook sent successfully
[ ] Structure matches app webhooks

Browser Console Tests
[ ] Test 1 passed (structure verification)
[ ] Test 2 passed (comparison with admin)

Bubble Verification
[ ] Data initialization successful
[ ] All fields accessible
[ ] Database records correct

Overall Result: [ ] PASS  [ ] FAIL

Notes:
_________________________________
_________________________________
_________________________________
```

---

## 🎯 Next Steps After Testing

1. ✅ Verify all tests pass
2. ✅ Document any issues found
3. ✅ Deploy to production
4. ✅ Monitor Bubble logs for errors
5. ✅ Confirm data quality in production

