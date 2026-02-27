// Create global variables
let userEmail = '';
let userCity = '';
let userZip = '';
// Function to update global variables
function updateVariables() {
  const emailInput = document.getElementById('email');
  const cityInput = document.getElementById('city');
  const zipInput = document.getElementById('zip');
  if (emailInput) {
    userEmail = emailInput.value;
  }
  if (cityInput) {
    userCity = cityInput.value;
  }
  if (zipInput) {
    userZip = zipInput.value;
  }
}
// Add event listeners to input boxes
document.addEventListener('DOMContentLoaded', function() {
  const emailInput = document.getElementById('email');
  const cityInput = document.getElementById('city');
  const zipInput = document.getElementById('zip');
  updateVariables();
  if (emailInput) {
    emailInput.addEventListener('input', updateVariables);
  }
  if (cityInput) {
    cityInput.addEventListener('input', updateVariables);
  }
  if (zipInput) {
    zipInput.addEventListener('input', updateVariables);
  }

  // Meta Pixel - AddPaymentInfo: fires once when the user first interacts with the checkout form
  const checkoutForm = document.getElementById('checkout-form');
  if (checkoutForm) {
    let addPaymentInfoFired = false;
    checkoutForm.addEventListener('input', function() {
      if (!addPaymentInfoFired) {
        addPaymentInfoFired = true;
        updateVariables();
        fbq('init', '935724062207149', {
          em: userEmail,
          zp: userZip,
          ct: userCity
        });
        fbq('track', 'AddPaymentInfo', {
          currency: 'USD',
          value: getCartTotal()
        });
      }
    });
  }
});

// Get the cart count element
const cartCountElement = document.getElementById('cart-count');

// Initialize the cart
let cart = {};

// Function to update the cart count
function updateCartCount() {
    const cartCount = Object.values(cart).reduce((acc, item) => acc + item.quantity, 0);
    cartCountElement.textContent = cartCount;
}

// Helper: build content_ids and contents arrays from the cart
function getCartPixelContents() {
    const contentIds = [];
    const contents = [];
    for (const name in cart) {
        const id = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        contentIds.push(id);
        contents.push({ id: id, quantity: cart[name].quantity });
    }
    return { contentIds, contents };
}

// Function to add an item to the cart
function addToCart(name, price) {
    if (cart[name]) {
        cart[name].quantity++;
    } else {
        cart[name] = { price, quantity: 1 };
    }
    updateCartCount();
    showNotification(`Added ${name} to cart!`);
    saveCartToLocalStorage();

    // Meta Pixel - AddToCart event
    const productId = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    fbq('init', '935724062207149', {
        em: userEmail,
        zp: userZip,
        ct: userCity
    });
    fbq('track', 'AddToCart', {
        content_ids: [productId],
        content_type: 'product',
        contents: [{ id: productId, quantity: 1 }],
        currency: 'USD',
        value: price
    });
}

// Function to remove an item from the cart
function removeFromCart(name) {
    if (cart[name]) {
        delete cart[name];
    }
    updateCartCount();
    saveCartToLocalStorage();
}

// Function to save the cart to local storage
function saveCartToLocalStorage() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

// Function to load the cart from local storage
function loadCartFromLocalStorage() {
    const storedCart = localStorage.getItem('cart');
    if (storedCart) {
        cart = JSON.parse(storedCart);
        updateCartCount();
    }
}

// Load the cart from local storage when the page loads
loadCartFromLocalStorage();

// Function to display the cart table
function displayCartTable() {
    const cartTableBody = document.getElementById('cart-body');
    cartTableBody.innerHTML = '';
    for (const name in cart) {
        const row = document.createElement('tr');
        const nameCell = document.createElement('td');
        nameCell.textContent = name;
        row.appendChild(nameCell);
        const priceCell = document.createElement('td');
        priceCell.textContent = `$${cart[name].price}`;
        row.appendChild(priceCell);
        const quantityCell = document.createElement('td');
        quantityCell.textContent = cart[name].quantity;
        row.appendChild(quantityCell);
        const totalCell = document.createElement('td');
        totalCell.textContent = `$${cart[name].price * cart[name].quantity}`;
        row.appendChild(totalCell);
        cartTableBody.appendChild(row);
    }

    // Calculate and display the cart total
    const total = getCartTotal();
    document.getElementById('cart-total').textContent = total.toFixed(2);
}

// Display the cart table when the cart page loads
if (document.getElementById('cart-table')) {
    displayCartTable();
}

// Function to initiate checkout
function initiateCheckout() {
    // Meta Pixel - InitiateCheckout event
    const { contentIds, contents } = getCartPixelContents();
    const numItems = Object.values(cart).reduce((acc, item) => acc + item.quantity, 0);
    fbq('init', '935724062207149', {
        em: userEmail,
        zp: userZip,
        ct: userCity
    });
    fbq('track', 'InitiateCheckout', {
        content_ids: contentIds,
        contents: contents,
        currency: 'USD',
        num_items: numItems,
        value: getCartTotal()
    });

    // Redirect to the checkout page
    window.location.href = 'checkout.html';
}

// Function to complete purchase
function completePurchase() {
    // Meta Pixel - Purchase event (fired before cart is cleared)
    updateVariables();
    const { contentIds, contents } = getCartPixelContents();
    const numItems = Object.values(cart).reduce((acc, item) => acc + item.quantity, 0);
    const totalValue = getCartTotal();
    fbq('init', '935724062207149', {
        em: userEmail,
        zp: userZip,
        ct: userCity
    });
    fbq('track', 'Purchase', {
        content_ids: contentIds,
        content_type: 'product',
        contents: contents,
        currency: 'USD',
        num_items: numItems,
        value: totalValue
    });

    // Clear the cart
    cart = {};
    saveCartToLocalStorage();
    updateCartCount();
    // Redirect to the purchase confirmation page
    window.location.href = 'purchase-confirmation.html';
}

// Add event listener to the purchase button
if (document.getElementById('purchase-btn')) {
    document.getElementById('purchase-btn').addEventListener('click', completePurchase);
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.classList.add('notification');
    notification.innerHTML = `
        <span>${message}</span>
        <svg width="20" height="20" viewBox="0 0 20 20">
            <path d="M10 2C5.14 2 1 5.14 1 10s4.14 8 9 8 9-4.14 9-8S14.86 2 10 2z" fill="#fff" />
        </svg>
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Function to get the total value of the cart
function getCartTotal() {
    let total = 0;
    for (const name in cart) {
        total += cart[name].price * cart[name].quantity;
    }
    return total;
}

// Function to display the cart summary
function displayCartSummary() {
    const cartSummaryBody = document.getElementById('cart-summary-body');
    cartSummaryBody.innerHTML = '';
    for (const name in cart) {
        const row = document.createElement('tr');
        const productCell = document.createElement('td');
        productCell.textContent = name;
        productCell.style.width = '40%';
        row.appendChild(productCell);
        const quantityCell = document.createElement('td');
        quantityCell.textContent = cart[name].quantity;
        quantityCell.style.width = '20%';
        quantityCell.style.textAlign = 'center';
        row.appendChild(quantityCell);
        const totalCell = document.createElement('td');
        totalCell.textContent = `$${cart[name].price * cart[name].quantity}`;
        totalCell.style.width = '40%';
        totalCell.style.textAlign = 'right';
        row.appendChild(totalCell);
        cartSummaryBody.appendChild(row);
    }
    // Calculate and display the cart total
    const total = getCartTotal();
    document.getElementById('cart-total').textContent = total.toFixed(2);
}
// Display the cart summary when the checkout page loads
if (document.getElementById('cart-summary-table')) {
    loadCartFromLocalStorage();
    displayCartSummary();
}
