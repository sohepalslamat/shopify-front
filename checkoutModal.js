// Utility function to validate email
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// Utility function to validate ZIP code (US format)
const validateZipCode = (zip) => /^\d{5}(-\d{4})?$/.test(zip);

const storeName = window.Shopify && window.Shopify.shop;

const loadCountries = async () => {
  try {
    const response = await fetch("/services/countries.json");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const countries = await response.json();

    // Data is already in the format we need, just map to our structure
    return countries.map((country) => ({
      code: country.code,
      name: country.name,
    }));
  } catch (error) {
    console.error("Error fetching countries from Shopify:", error);
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
    const response = await fetch(
      "https://raw.githubusercontent.com/sohepalslamat/shopify-front/refs/heads/main/modalContent.html"
    );
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
  console.log("Customer Data received:", customerData);

  window.customerData = customerData;
  if (customerData.status === "guest") {
    window.location.href = "/account/login";
  } else {
    // Make sure modal HTML is loaded first
    await loadModalHTML();
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
  if (customerData.status === "guest") return;

  const formType = window.formType;
  const prefix = formType === "simple" ? "simple" : "";

  const setInputValue = (id, value) => {
    const elementId = prefix + id.toLowerCase();
    const element = document.getElementById(elementId);
    if (element) {
      element.value = value || "";
    }
  };

  setTimeout(() => {
    setInputValue("email", customerData.email);

    if (customerData.default_address) {
      const primaryAddress = customerData.default_address;

      setInputValue("firstname", primaryAddress.first_name);
      setInputValue("lastname", primaryAddress.last_name);
      setInputValue("phone", primaryAddress.phone);
      setInputValue("city", primaryAddress.city);
      setInputValue("province", primaryAddress.province);
      setInputValue("country", primaryAddress.country);
      setInputValue("zip", primaryAddress.zip);
      setInputValue("address1", primaryAddress.address1);
    }
  }, 100);
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
  document.querySelectorAll(".error-message").forEach((errMsg) => {
    errMsg.style.display = "none";
  });

  const formType = window.formType;
  const prefix = formType === "simple" ? "simple" : "";

  const firstName = document.getElementById(prefix + "firstname").value.trim();
  const lastName = document.getElementById(prefix + "lastname").value.trim();
  const email = document.getElementById(prefix + "email").value.trim();
  const phone = document.getElementById(prefix + "phone").value.trim();

  if (!firstName) {
    document.querySelector(`input[id="${prefix}firstname"] + .error-message`).style.display = "block";
    isValid = false;
  }
  if (!lastName) {
    document.querySelector(`input[id="${prefix}lastname"] + .error-message`).style.display = "block";
    isValid = false;
  }
  if (!email || !validateEmail(email)) {
    document.querySelector(`input[id="${prefix}email"] + .error-message`).style.display = "block";
    isValid = false;
  }
  if (!phone) {
    document.querySelector(`input[id="${prefix}phone"] + .error-message`).style.display = "block";
    isValid = false;
  }

  // Only validate address fields for full form
  if (formType !== "simple") {
    const city = document.getElementById("city").value.trim();
    const country = document.getElementById("country").value;
    const zip = document.getElementById("zip").value.trim();
    const address1 = document.getElementById("address1").value.trim();

    if (!city) {
      document.querySelector(
        'input[name="city"] + .error-message'
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
      document.querySelector(
        'input[name="zip"] + .error-message'
      ).style.display = "block";
      isValid = false;
    }
    if (!address1) {
      document.querySelector(
        'input[name="address1"] + .error-message'
      ).style.display = "block";
      isValid = false;
    }
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
  const formType = window.formType;
  const prefix = formType === "simple" ? "simple" : "";

  const firstName = document.getElementById(prefix + "firstname").value.trim();
  const lastName = document.getElementById(prefix + "lastname").value.trim();
  const email = document.getElementById(prefix + "email").value.trim();
  const phone = document.getElementById(prefix + "phone").value.trim();

  let orderData = {
    buyerIdentity: {
      phone: phone,
      email: email,
      deliveryAddressPreferences: [
        {
          deliveryAddress: {
            firstName: firstName,
            lastName: lastName,
            phone: phone,
          },
        },
      ],
    },
    cartId: `gid://shopify/Cart/${window.modalData.token}`,
  };

  // Add address fields only for full form
  if (formType !== "simple") {
    const city = document.getElementById("city").value.trim();
    const province = document.getElementById("province").value.trim();
    const country = document.getElementById("country").value;
    const zip = document.getElementById("zip").value.trim();
    const address1 = document.getElementById("address1").value.trim();

    orderData.buyerIdentity.deliveryAddressPreferences[0].deliveryAddress = {
      ...orderData.buyerIdentity.deliveryAddressPreferences[0].deliveryAddress,
      address1: address1,
      city: city,
      province: province,
      country: country,
      zip: zip,
    };
  }

  // Add customer ID if customer exists and is not a guest
  if (window.customerData && window.customerData.customer_id) {
    orderData.customer_id = window.customerData.customer_id;
  }

  // Add address ID if it exists
  if (
    window.customerData &&
    window.customerData.default_address &&
    window.customerData.default_address.id
  ) {
    orderData.address_id = window.customerData.default_address.id;
  }

  return orderData;
};

// Sends the collected order data to the target endpoint
const sendData = async (redirect_url) => {
  const formType = window.formType;
  const prefix = formType === "simple" ? "simple" : "";

  const dataToSend = {
    order_id: window.modalData.token,
    email: document.getElementById(prefix + "email").value,
    shop_type: "shopify",
    shop_url: redirect_url,
    hookUrl: `https://shopify.congpt.v2202107122785158474.goodsrv.de/webhook/8b67370f4efec2ce70c52a007c542aa4/ekhbqf-c1`,
    currency: window.modalData.currency,
    total: window.modalData.total,
    timestamp: new Date().getTime(),
    first_name: document.getElementById(prefix + "firstname").value,
    last_name: document.getElementById(prefix + "lastname").value,
    phone: document.getElementById(prefix + "phone").value,
    fail_url: `https://${storeName}/cart`,
    customer_id: window.customerData.customer_id || null,
  };

  // Add address fields only for full form
  if (formType !== "simple") {
    dataToSend.country = document.getElementById("country").value;
    dataToSend.city = document.getElementById("city").value;
    dataToSend.billing_address = "not included";
    dataToSend.postcode = document.getElementById("zip").value;
  }

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
  const loadingOverlay = document.getElementById("loadingOverlay");
  const formType = window.formType; // Default to full form

  // Show appropriate form based on data attribute
  const simpleFormContainer = document.getElementById("simpleFormContainer");
  const fullFormContainer = document.getElementById("fullFormContainer");

  if (formType === "simple") {
    simpleFormContainer.style.display = "block";
    fullFormContainer.style.display = "none";
    handleFormSubmission(
      document.getElementById("simpleCustomerForm"),
      loadingOverlay
    );
  } else {
    simpleFormContainer.style.display = "none";
    fullFormContainer.style.display = "block";
    handleFormSubmission(
      document.getElementById("fullCustomerForm"),
      loadingOverlay
    );
  }

  setupModalTrigger(modalContainer);
  setupModalClose(modalContainer, closeModalBtn);
};

document.addEventListener("DOMContentLoaded", function () {
  // Access the script tag itself
  const scriptTag =
    document.currentScript || document.querySelector("script[data-code]");
  if (scriptTag) {
    // Get both data attributes
    const dataCode = scriptTag.getAttribute("data-code");
    const formType = scriptTag.getAttribute("data-form-type");

    // Store both values on window object
    window.dataKey = dataCode;
    window.formType = formType || "full"; // Default to 'full' if not specified
  } else {
    console.log(
      "Script tag not found, or currentScript is not supported in this context."
    );
  }
  createModal();
});
