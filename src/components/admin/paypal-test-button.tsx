'use client';

import React, { useEffect, useRef } from 'react';

const PayPalTestButton = () => {
  const paypalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if the script is already loaded to avoid duplicates
    if (window.paypal) {
        if(paypalRef.current && paypalRef.current.childElementCount === 0) {
             window.paypal.Buttons({
                style: {
                    shape: 'rect',
                    color: 'gold',
                    layout: 'vertical',
                    label: 'subscribe'
                },
                createSubscription: function(data: any, actions: any) {
                    return actions.subscription.create({
                        plan_id: 'P-1MY6909006374532YNDMJFKA'
                    });
                },
                onApprove: function(data: any, actions: any) {
                    alert(data.subscriptionID); // Optional success message
                }
            }).render(paypalRef.current);
        }
        return;
    }

    const script = document.createElement('script');
    script.src = "https://www.paypal.com/sdk/js?client-id=Ad1fmZcpChMI2mD0r410iCxueoEG-LLYBu2rgpBtbrDmatsX0BTWKuaEq0_gLYgBEiRC8gq3IwtY79hp&vault=true&intent=subscription";
    script.setAttribute('data-sdk-integration-source', 'button-factory');
    
    script.onload = () => {
      if (paypalRef.current && window.paypal) {
        window.paypal.Buttons({
            style: {
                shape: 'rect',
                color: 'gold',
                layout: 'vertical',
                label: 'subscribe'
            },
            createSubscription: function(data: any, actions: any) {
              return actions.subscription.create({
                /* Creates the subscription */
                plan_id: 'P-1MY6909006374532YNDMJFKA'
              });
            },
            onApprove: function(data: any, actions: any) {
              alert(data.subscriptionID); // You can add optional success message for the subscriber here
            }
        }).render(paypalRef.current);
      }
    };
    
    document.body.appendChild(script);

    return () => {
      // Optional: Cleanup script on component unmount, though often not necessary for SDKs like this
    };
  }, []);

  return (
    <div ref={paypalRef} id="paypal-button-container-P-1MY6909006374532YNDMJFKA"></div>
  );
};

// Extend window type to include paypal
declare global {
  interface Window {
    paypal?: any;
  }
}

export default PayPalTestButton;
