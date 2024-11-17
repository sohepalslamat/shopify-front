// Utility function to validate email
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// Utility function to validate ZIP code (US format)
const validateZipCode = (zip) => /^\d{5}(-\d{4})?$/.test(zip);

const storeName = window.Shopify && window.Shopify.shop;

const loadCountries = async () => {
  try {
    const response = await fetch("https://gist.githubusercontent.com/sohepalslamat/a69e2b52c4143b614061624872afab7e/raw/340e82ce0fde8de5e524a10041937c57613f996f/countries.json");
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const countries = await response.json();
    return countries;
  } catch (error) {
    console.error("Error fetching countries:", error);
    return [];
  }
};

const generateCountryOptions = (countries) => {
  return countries
    .map(
      (country) => `<option value="${country.code}">${country.name}</option>`
    )
    .join("");
};

const loadModalHTML = async () => {
  try {
    const response = await fetch("https://gist.githubusercontent.com/sohepalslamat/b5ce55129133a1a2563a9ceafe0f0fd0/raw/908ec71057b115d04fca95d27cfae76a0b3d6b0d/modalContent.html");
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const html = await response.text();

    const countries = await loadCountries();
    const countryOptions = generateCountryOptions(countries);

    const updatedHTML = html.replace(
      "${countryOptionsPlaceholder}",
      countryOptions
    );
    document.body.insertAdjacentHTML("beforeend", updatedHTML);    
  } catch (error) {
    console.error("Error loading modal HTML:", error);
  }
};

const setupModalTrigger = (modalContainer) => {
  document.querySelectorAll("#openModal").forEach((button) => {
    button.onclick = async function (event) {
      event.preventDefault();
      showModal(modalContainer, button);
    };
  });
};

const hideModal = (modalContainer) => {
  modalContainer.style.display = "none";
};

const setupModalClose = (modalContainer, closeModalBtn) => {
  closeModalBtn.onclick = () => hideModal(modalContainer);
  window.onclick = (event) => {
    if (event.target === modalContainer) hideModal(modalContainer);
  };
};

const handleFormSubmission = (form, loadingOverlay) => {
  form.onsubmit = async (event) => {
    event.preventDefault();
    if (isFormValid()) {
      showLoading(loadingOverlay);
      await submitOrder();
      hideLoading(loadingOverlay);
    }
  };
};

const showModal = async (modalContainer, button) => {
  const customerData = getCustomerData(button);
  if (customerData.status === "guest") {
    window.location.href = "/account/login";
  } else {
    populateFormData(customerData);
  }
  await fetchCartData();
  modalContainer.style.display = "block";
};

const getCustomerData = (button) => {
  const customerDataString = button.getAttribute("data-customer");
  return JSON.parse(customerDataString);
};

const populateFormData = (customerData) => {
  document.getElementById("firstName").value = customerData.first_name || "";
  document.getElementById("lastName").value = customerData.last_name || "";
  document.getElementById("email").value = customerData.email || "";
  document.getElementById("city").value = customerData.city || "";
  document.getElementById("province").value = customerData.province || "";
  document.getElementById("country").value = customerData.country || "";
  document.getElementById("zip").value = customerData.zip || "";
  document.getElementById("address1").value = customerData.address1 || "";
  document.getElementById("phone").value = customerData.phone || "";
};

const fetchCartData = async () => {
  try {
    const response = await fetch("/cart.js");
    const cartData = await response.json();
    processCartData(cartData);
  } catch (e) {
    console.error("Error fetching cart data:", e);
    alert("Error fetching cart data. Please try again.");
  }
};

const processCartData = (cartData) => {
  // Extract necessary values
  const total = cartData.total_price / 100; // price in SAR
  const currency = cartData.currency; // currency from cart
  const items = cartData.items || []; // line items for order creation

  // Check if items is an array
  if (!Array.isArray(items)) {
    throw new Error("Items is not an array. Check cart data.");
  }

  // Prepare the line items for the order creation
  const lineItems = items.map((item) => ({
    title: item.product_title || item.title,
    price: item.price / 100, // Convert from cents to currency
    grams: item.grams || 0, // Default to 0 if not provided
    quantity: item.quantity,
    variant_id: item.variant_id,
    tax_lines: item.tax_lines
      ? item.tax_lines.map((tax) => ({
          price: tax.price,
          rate: tax.rate,
          title: tax.title,
        }))
      : [],
  }));
  // Create an object to hold relevant modal data
  window.modalData = {
    total: total.toFixed(2), // Format total price
    currency: currency,
    lineItems: lineItems, // Pass the line items for the order
    token: cartData.token || null, // cart token "cartId": "gid://shopify/Cart/Z2NwLXVzLWNlbnRyYWwxOjAxSkJQRjcxNjVKUzVTRzFYRTBGMEtBQU1O?key=eabf213b702dc6a45ae035fcac17b880"
  };
};

// Validates the form inputs
const isFormValid = () => {
  let isValid = true;
  // Clear previous error messages
  document.querySelectorAll(".error-message").forEach((errMsg) => {
    errMsg.style.display = "none";
  });

  // Validate inputs
  const firstName = document.getElementById("firstName").value.trim();
  const lastName = document.getElementById("lastName").value.trim();
  const email = document.getElementById("email").value.trim();
  const city = document.getElementById("city").value.trim();
  const province = document.getElementById("province").value.trim();
  const country = document.getElementById("country").value; // Get selected country code
  const zip = document.getElementById("zip").value.trim();
  const address1 = document.getElementById("address1").value.trim();
  const phone = document.getElementById("phone").value.trim();

  // Check if fields are empty
  if (!firstName) {
    document.querySelector(
      'input[name="firstName"] + .error-message'
    ).style.display = "block";
    isValid = false;
  }
  if (!lastName) {
    document.querySelector(
      'input[name="lastName"] + .error-message'
    ).style.display = "block";
    isValid = false;
  }
  if (!email || !validateEmail(email)) {
    document.querySelector('input[name="email"] + .error-message').style.display =
      "block";
    isValid = false;
  }
  if (!city) {
    document.querySelector('input[name="city"] + .error-message').style.display =
      "block";
    isValid = false;
  }
  if (!province) {
    document.querySelector(
      'input[name="province"] + .error-message'
    ).style.display = "block";
    isValid = false;
  }
  if (!country) {
    document.querySelector(
      'select[name="country"] + .error-message'
    ).style.display = "block";
    isValid = false;
  }
  if (!zip || !validateZipCode(zip)) {
    document.querySelector('input[name="zip"] + .error-message').style.display =
      "block";
    isValid = false;
  }
  if (!address1) {
    document.querySelector(
      'input[name="address1"] + .error-message'
    ).style.display = "block";
    isValid = false;
  }
  if (!phone) {
    document.querySelector('input[name="phone"] + .error-message').style.display =
      "block";
    isValid = false;
  }

  if (!isValid) {
    return; // Prevent form submission if validation fails
  }
  return isValid;
};

// Submit order using the form data
const submitOrder = async () => {
  const orderData = collectOrderData();
  try {
    const response = await fetch(
      `https://shopify.congpt.v2202107122785158474.goodsrv.de/cart_update/${window.dataKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      }
    );

    if (response.ok) {
      const data = await response.json();
      await sendData(data.checkoutUrl);
    } else {
      throw new Error("Network response was not ok");
    }
  } catch (error) {
    console.error("Error creating order:", error);
    alert("An error occurred while creating the order.");
  }
};

const collectOrderData = () => {
  const firstName = document.getElementById("firstName").value.trim();
  const lastName = document.getElementById("lastName").value.trim();
  const email = document.getElementById("email").value.trim();
  const city = document.getElementById("city").value.trim();
  const province = document.getElementById("province").value.trim();
  const country = document.getElementById("country").value; // Get selected country code
  const zip = document.getElementById("zip").value.trim();
  const address1 = document.getElementById("address1").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const orderData = {
    buyerIdentity: {
      countryCode: country,
      phone: phone,
      email: email,
      deliveryAddressPreferences: [
        {
          deliveryAddress: {
            firstName: firstName,
            lastName: lastName,
            address1: address1,
            phone: phone,
            city: city,
            province: province,
            country: country, // Send country code
            zip: zip,
          },
        },
      ],
    },
    cartId: `gid://shopify/Cart/${window.modalData.token}`,
  };
  return orderData;
};

// Sends the collected order data to the target endpoint
const sendData = async (redirect_url) => {
  const dataToSend = {
    order_id: window.modalData.token, // cart id
    email: document.getElementById("email").value,
    shop_type: "shopify",
    shop_url: redirect_url,
    hookUrl:
      `https://shopify.congpt.v2202107122785158474.goodsrv.de/webhook/${window.dataKey}`,
    currency: window.modalData.currency,
    total: window.modalData.total,
    timestamp: new Date().getTime(), // Example timestamp
    first_name: document.getElementById("firstName").value,
    last_name: document.getElementById("lastName").value,
    country: document.getElementById("country").value, // Sending country code
    city: document.getElementById("city").value,
    billing_address: "not included",
    postcode: document.getElementById("zip").value,
    fail_url: `https://${storeName}/cart`,
    customer_id: "1", // Set to the actual customer ID if available
    phone: document.getElementById("phone").value,
  };

  try {
    const response = await fetch(
      "https://mtjree.link/wp-json/custom/v1/proxy",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSend),
      }
    );

    if (response.ok) {
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Unexpected response. Information not received.");
      }
    } else {
      throw new Error("Network response was not ok");
    }
  } catch (error) {
    console.error("Error sending data:", error);
    alert("An error occurred while sending data. Please try again.");
  }
};

const showLoading = (loadingOverlay) => {
  loadingOverlay.style.display = "block";
};

const hideLoading = (loadingOverlay) => {
  loadingOverlay.style.display = "none";
};

// Run the function to create the modal in the DOM
const createModal = async () => {
  await loadModalHTML();

  const modalContainer = document.getElementById("modalFormContainer");
  const closeModalBtn = document.getElementById("closeModal");
  const form = document.getElementById("customerInfoForm");
  const loadingOverlay = document.getElementById("loadingOverlay");
  setupModalTrigger(modalContainer);
  setupModalClose(modalContainer, closeModalBtn);
  handleFormSubmission(form, loadingOverlay);
};

document.addEventListener("DOMContentLoaded", function () {
  // Access the script tag itself
  const scriptTag =
    document.currentScript || document.querySelector("script[data-code]"); // Fallback if needed
  if (scriptTag) {
    const dataCode = scriptTag.getAttribute("data-code");
    window.dataKey = dataCode;
  } else {
    console.log(
      "Script tag not found, or currentScript is not supported in this context."
    );
  }
  createModal();
});

