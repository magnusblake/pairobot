// Simple test script to check if orderbook API works
// Using built-in fetch in Node.js 22

async function testOrderBook() {
  try {
    console.log('🧪 Testing orderbook API...\n');
    
    // Test 1: Check if bot is running
    console.log('1️⃣ Checking if bot is running...');
    const statusResponse = await fetch('http://localhost:3002/orderbook-status');
    if (statusResponse.ok) {
      const status = await statusResponse.json();
      console.log('✅ Bot is running!');
      console.log('📊 Status:', JSON.stringify(status, null, 2));
    } else {
      console.log('❌ Bot is not running or not responding');
      return;
    }
    
    console.log('\n2️⃣ Testing BTC/USDT orderbook...');
    const btcResponse = await fetch('http://localhost:3002/orderbook/BTC%2FUSDT');
    if (btcResponse.ok) {
      const data = await btcResponse.json();
      console.log('✅ BTC/USDT orderbook received!');
      console.log('📈 Bids:', data.orderBook.bids.length);
      console.log('📉 Asks:', data.orderBook.asks.length);
      console.log('💰 Best bid:', data.orderBook.bids[0]);
      console.log('💰 Best ask:', data.orderBook.asks[0]);
    } else {
      console.log('❌ Failed to get BTC/USDT orderbook');
    }
    
    console.log('\n✅ Test completed!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testOrderBook();
