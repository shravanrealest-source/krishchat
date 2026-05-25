import dotenv from 'dotenv';
dotenv.config();

import * as fs from 'fs';
import * as path from 'path';
import { extractPhoneNumbers, saveContacts } from './utils/contactHelper';
import { getTemplates, saveTemplate, TextButtonTemplate } from './utils/templateHelper';
import { refineTemplate, extractSmartNumbers, handleChatInteraction } from './utils/geminiHelper';

async function runTests() {
  console.log('--- Starting Backend Number Processing Tests ---');

  // Test 1: Extract Phone Numbers Logic
  console.log('\n[Test 1] Testing extractPhoneNumbers...');

  const testCases = [
    {
      input: 'My number is 9876543210. Another one is 919876543211.',
      expected: ['919876543210', '919876543211']
    },
    {
      input: 'Call me at +91-99999-88888 or +1 (123) 456-7890.',
      // +91-99999-88888 -> cleaned is 919999988888 (length 12) -> kept as is.
      // +1 (123) 456-7890 -> cleaned is 11234567890 (length 11) -> kept as is.
      expected: ['919999988888', '11234567890']
    },
    {
      input: 'Invalid numbers: 12345 (too short), 12345678901234567 (too long). Valid: 9876543210',
      expected: ['919876543210']
    },
    {
      input: 'Duplicates batch: 9876543210, 98765-43210, +91 98765 43210, 919876543210',
      // all these map to '919876543210'
      expected: ['919876543210']
    },
    {
      input: 'Multiple numbers separated by spaces:\n9876543210   9123456789\n8888888888',
      expected: ['919876543210', '919123456789', '918888888888']
    }
  ];

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const actual = extractPhoneNumbers(tc.input);
    const success = JSON.stringify(actual.sort()) === JSON.stringify(tc.expected.sort());
    
    if (success) {
      console.log(`  ✓ Test Case ${i + 1} Passed`);
    } else {
      console.error(`  ✗ Test Case ${i + 1} Failed`);
      console.error(`    Input:    ${JSON.stringify(tc.input)}`);
      console.error(`    Expected: ${JSON.stringify(tc.expected)}`);
      console.error(`    Actual:   ${JSON.stringify(actual)}`);
    }
  }

  // Test 2: Local Storage saving and merging logic
  console.log('\n[Test 2] Testing saveContacts...');

  const contactsFile = path.resolve(__dirname, '../data/contacts.json');

  // Remove contacts file if it exists to start fresh for test
  if (fs.existsSync(contactsFile)) {
    fs.unlinkSync(contactsFile);
  }

  // Save first batch
  const batch1 = ['919876543210', '919123456789'];
  const res1 = saveContacts(batch1);
  console.log(`  Batch 1 save results:`, res1);
  console.assert(res1.addedCount === 2, 'Batch 1 addedCount should be 2');
  console.assert(res1.totalCount === 2, 'Batch 1 totalCount should be 2');

  // Verify file contents
  const fileData1 = JSON.parse(fs.readFileSync(contactsFile, 'utf8'));
  console.log(`  File contents after Batch 1:`, fileData1);
  console.assert(fileData1.length === 2, 'Saved file should contain 2 contacts');

  // Save second batch (contains duplicate and new number)
  const batch2 = ['919876543210', '918888888888'];
  const res2 = saveContacts(batch2);
  console.log(`  Batch 2 save results:`, res2);
  console.assert(res2.addedCount === 1, 'Batch 2 addedCount should be 1 (only 8888888888 is new)');
  console.assert(res2.totalCount === 3, 'Batch 2 totalCount should be 3');

  // Verify file contents again
  const fileData2 = JSON.parse(fs.readFileSync(contactsFile, 'utf8'));
  console.log(`  File contents after Batch 2:`, fileData2);
  console.assert(fileData2.length === 3, 'Saved file should contain 3 contacts');

  // Test 3: Template storage saving, retrieval, and validation
  console.log('\n[Test 3] Testing saveTemplate and getTemplates...');

  const templatesFile = path.resolve(__dirname, '../data/templates.json');

  // Remove templates file to start fresh for test
  if (fs.existsSync(templatesFile)) {
    fs.unlinkSync(templatesFile);
  }

  // 1. Save Text Template
  const textTemplateData = {
    name: 'Welcome Text',
    type: 'text' as const,
    content: 'Welcome to our service!'
  };
  const savedText = saveTemplate(textTemplateData);
  console.log('  Saved Text Template:', savedText);
  console.assert(savedText.id !== undefined, 'Template should have an id');
  console.assert(savedText.name === 'Welcome Text', 'Name should match');
  console.assert(savedText.type === 'text', 'Type should match');

  // 2. Save Text + Button Template
  const textButtonTemplateData = {
    name: 'Discount Offer',
    type: 'text_button' as const,
    content: 'Get 20% off now!',
    buttons: ['Claim', 'Decline']
  };
  const savedButton = saveTemplate(textButtonTemplateData);
  console.log('  Saved Text Button Template:', savedButton);
  if (savedButton.type === 'text_button') {
    console.assert(savedButton.buttons.length === 2, 'Buttons array length should be 2');
  } else {
    console.error('  ✗ Expected type to be text_button');
  }

  // 3. Save Image + Text + Button Template
  const imageTemplateData = {
    name: 'Product Catalog',
    type: 'image_text_button' as const,
    imageUrl: 'https://example.com/catalog.jpg',
    content: 'Check out our new catalog.',
    buttons: ['Shop Now']
  };
  const savedImage = saveTemplate(imageTemplateData);
  console.log('  Saved Image Text Button Template:', savedImage);

  // 4. Retrieve Templates
  const allTemplates = getTemplates();
  console.log(`  Retrieved ${allTemplates.length} templates.`);
  console.assert(allTemplates.length === 3, 'Should have retrieved 3 templates');

  // 5. Test validation (more than 3 buttons)
  try {
    const invalidTemplate: Omit<TextButtonTemplate, 'id'> = {
      name: 'Invalid Template',
      type: 'text_button' as const,
      content: 'Too many buttons!',
      buttons: ['B1', 'B2', 'B3', 'B4']
    };
    saveTemplate(invalidTemplate);
    console.error('  ✗ Expected error for more than 3 buttons, but none was thrown.');
  } catch (error: any) {
    console.log('  ✓ Correctly threw error for invalid buttons count:', error.message);
  }

  // Test 4: Gemini AI helper functions
  console.log('\n[Test 4] Testing Gemini AI helper functions (async)...');
  try {
    // 1. Test template refinement
    const originalText = 'hi buy our app now it is cheap';
    console.log(`  Original text: "${originalText}"`);
    const refined = await refineTemplate(originalText);
    console.log(`  Refined text:  "${refined}"`);
    console.assert(refined.length > 0, 'Refined text should not be empty');

    // 2. Test smart number extraction
    const messyText = 'call me at nine eight seven six five four three two one zero';
    console.log(`  Messy text with spelled-out numbers: "${messyText}"`);
    const extracted = await extractSmartNumbers(messyText);
    console.log(`  Extracted smart numbers:              "${extracted}"`);
    console.assert(extracted.length > 0, 'Extracted text should not be empty');

    // 3. Test multi-turn conversational tool calling
    console.log('\n[Test 5] Testing handleChatInteraction tool calling (async)...');
    
    const chatMessages = [
      {
        role: 'user',
        parts: [{ text: 'Save these numbers: 1234567890 and draft a text template for a 10% discount.' }]
      }
    ];
    
    console.log(`  User Prompt: "${chatMessages[0].parts[0].text}"`);
    const chatResponse = await handleChatInteraction(chatMessages);
    console.log(`  Agent Response: "${chatResponse}"`);
    console.assert(chatResponse.length > 0, 'Agent response should not be empty');

    // Verify contacts were saved
    const contactsData = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../data/contacts.json'), 'utf8'));
    console.log('  Contacts list after chat execution:', contactsData);
    console.assert(contactsData.includes('911234567890'), 'Should contain normalized 911234567890');

    // Verify template was saved
    const templatesData = getTemplates();
    const discountTemplate = templatesData.find((t: any) => t.name.toLowerCase().includes('discount') || t.content.toLowerCase().includes('10%'));
    console.log('  Discount template found in database:', discountTemplate);
    console.assert(discountTemplate !== undefined, 'Should have created a discount template');

    console.log('\n--- All Tests (including Gemini AI) Completed Successfully ---');
  } catch (err: any) {
    console.error('  ✗ Gemini AI Test failed:', err.message);
  }
}

runTests();
